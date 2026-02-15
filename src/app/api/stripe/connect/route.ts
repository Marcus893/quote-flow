import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if caller wants to return to settings instead of onboarding
    let returnTo = "onboarding";
    try {
      const body = await request.json();
      if (body.returnTo === "settings") returnTo = "settings";
    } catch {
      // no body is fine
    }

    // Store returnTo in cookie so return/refresh routes know where to redirect
    const cookieStore = await cookies();
    cookieStore.set("stripe_return_to", returnTo, { path: "/", maxAge: 3600 });

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, business_name, email")
      .eq("id", user.id)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let accountId = profile?.stripe_account_id;

    // Create Stripe Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile?.email || user.email || undefined,
        business_profile: {
          name: profile?.business_name || undefined,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Save to profile
      await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
    }

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
      return_url: `${baseUrl}/api/stripe/connect/return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create Stripe Connect account";
    console.error("Stripe Connect error:", message);
    
    // Provide actionable error for Connect not enabled
    if (message.includes("signed up for Connect") || message.includes("create new accounts")) {
      return NextResponse.json({
        error: "Stripe Connect is not enabled on your Stripe account. Go to dashboard.stripe.com/connect/overview to activate it, then try again.",
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
