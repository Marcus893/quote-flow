import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// Check if the contractor's Stripe account has completed onboarding
export async function GET() {
  try {
    const stripe = getStripe();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ connected: false, reason: "no_account" });
    }

    // Retrieve Stripe account to check if onboarding is complete
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const connected =
      account.charges_enabled === true && account.payouts_enabled === true;

    return NextResponse.json({
      connected,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to check Stripe status";
    console.error("Stripe status error:", message);
    return NextResponse.json({ connected: false, error: message });
  }
}
