import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createAdminClient, SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

// Recursively delete all files in a storage bucket folder (handles nested sub-folders)
async function deleteStorageFolder(
  admin: SupabaseClient,
  bucket: string,
  folderPath: string
) {
  const { data: items } = await admin.storage.from(bucket).list(folderPath);
  if (!items || items.length === 0) return;

  const files: string[] = [];
  const subFolders: string[] = [];

  for (const item of items) {
    if (item.name === ".emptyFolderPlaceholder") continue;
    const fullPath = `${folderPath}/${item.name}`;
    // Folders have id === null in Supabase storage
    if (item.id === null) {
      subFolders.push(fullPath);
    } else {
      files.push(fullPath);
    }
  }

  // Recurse into sub-folders first
  for (const sub of subFolders) {
    await deleteStorageFolder(admin, bucket, sub);
  }

  // Delete files in this folder
  if (files.length > 0) {
    await admin.storage.from(bucket).remove(files);
    console.log(`Deleted ${files.length} files from ${bucket}/${folderPath}`);
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use admin client for all operations to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get profile to retrieve Stripe customer ID before deletion
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    // Cancel all Stripe subscriptions and delete the customer
    if (profile?.stripe_customer_id) {
      try {
        const stripe = getStripe();

        // Cancel all active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: "active",
          limit: 100,
        });
        for (const sub of subscriptions.data) {
          await stripe.subscriptions.cancel(sub.id);
          console.log(`Cancelled subscription ${sub.id} during account deletion`);
        }

        // Also cancel any past_due subscriptions
        const pastDueSubs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: "past_due",
          limit: 100,
        });
        for (const sub of pastDueSubs.data) {
          await stripe.subscriptions.cancel(sub.id);
        }

        // Delete the Stripe customer entirely
        await stripe.customers.del(profile.stripe_customer_id);
        console.log(`Deleted Stripe customer ${profile.stripe_customer_id} during account deletion`);
      } catch (stripeErr) {
        console.error("Failed to clean up Stripe data:", stripeErr);
        // Continue with account deletion even if Stripe cleanup fails
      }
    }

    // Get all quotes to clean up payment-receipts (organized by quoteId)
    const { data: userQuotes } = await supabaseAdmin
      .from("quotes")
      .select("id")
      .eq("contractor_id", user.id);

    // Delete receipt files for each quote (using admin client to bypass RLS)
    if (userQuotes && userQuotes.length > 0) {
      for (const quote of userQuotes) {
        await deleteStorageFolder(supabaseAdmin, "payment-receipts", quote.id);
      }
    }

    // Storage files — logos (recursively delete all nested files)
    await deleteStorageFolder(supabaseAdmin, "logos", user.id);

    // Storage files — quote-photos (recursively delete all nested files)
    await deleteStorageFolder(supabaseAdmin, "quote-photos", user.id);

    // Delete profile (cascades to customers, quotes, payments)
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
