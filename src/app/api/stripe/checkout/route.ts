import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const { quoteId, amount } = body;

    if (!quoteId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing quoteId or amount" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch quote with contractor profile
    const { data: quote } = await supabase
      .from("quotes")
      .select("*, profiles(*), customers(*)")
      .eq("id", quoteId)
      .single();

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const contractor = quote.profiles;
    const customer = quote.customers;

    if (!contractor?.stripe_account_id) {
      return NextResponse.json(
        { error: "This contractor has not set up credit card payments yet." },
        { status: 400 }
      );
    }

    const { getBaseUrl } = await import("@/lib/url");
    const baseUrl = getBaseUrl();
    const amountInCents = Math.round(amount * 100);

    // Calculate application fee (e.g., 2% platform fee)
    const applicationFee = Math.round(amountInCents * 0.02);

    // Create Stripe Checkout Session with Connected Account as destination
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: quote.quote_name || "Quote Payment",
              description: `Payment to ${contractor.business_name || "Contractor"}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: contractor.stripe_account_id,
        },
      },
      customer_email: customer?.email || undefined,
      metadata: {
        quote_id: quoteId,
        amount: amount.toString(),
      },
      success_url: `${baseUrl}/quote/${quoteId}?payment=success`,
      cancel_url: `${baseUrl}/quote/${quoteId}?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    console.error("Stripe Checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
