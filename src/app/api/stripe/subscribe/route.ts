import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { tier } = await request.json();

    if (!tier || !["pro", "lifetime"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get profile to check for existing Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, business_name, subscription_tier")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Don't allow downgrade to same or higher tier
    if (profile.subscription_tier === "lifetime") {
      return NextResponse.json({ error: "You already have lifetime access" }, { status: 400 });
    }
    if (profile.subscription_tier === "pro" && tier === "pro") {
      return NextResponse.json({ error: "You are already on the Pro plan" }, { status: 400 });
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email || undefined,
        name: profile.business_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      // Save customer ID to profile
      const serviceSupabase = getServiceSupabase();
      await serviceSupabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Check for existing active subscriptions on Stripe to prevent duplicates
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    if (tier === "pro" && existingSubscriptions.data.length > 0) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // If upgrading to lifetime, cancel all active Pro subscriptions immediately
    if (tier === "lifetime" && existingSubscriptions.data.length > 0) {
      for (const sub of existingSubscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
        console.log(`Cancelled subscription ${sub.id} before Lifetime purchase`);
      }
    }

    // Determine price ID based on tier
    const priceId =
      tier === "pro"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_LIFETIME_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price ID not configured for ${tier}` },
        { status: 500 }
      );
    }

    // Create Checkout Session
    const sessionParams: Record<string, unknown> = {
      customer: customerId,
      mode: tier === "pro" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?subscription_success=${tier}`,
      cancel_url: `${baseUrl}/subscription?cancelled=true`,
      metadata: {
        user_id: user.id,
        tier: tier,
      },
    };

    // For lifetime one-time payment, include metadata on payment intent
    if (tier === "lifetime") {
      sessionParams.payment_intent_data = {
        metadata: { user_id: user.id, tier: "lifetime" },
      };
    } else {
      sessionParams.subscription_data = {
        metadata: { user_id: user.id, tier: "pro" },
      };
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]
    );

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Subscription checkout error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
