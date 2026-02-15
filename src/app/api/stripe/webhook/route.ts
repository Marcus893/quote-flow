import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role client for webhook (no user auth context)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // ---- Handle subscription/lifetime purchase ----
    const subTier = session.metadata?.tier;
    const subUserId = session.metadata?.user_id;

    if (subTier && subUserId) {
      try {
        const supabase = getServiceClient();
        const updateData: Record<string, unknown> = {
          subscription_tier: subTier,
          updated_at: new Date().toISOString(),
        };

        if (subTier === "pro" && session.subscription) {
          updateData.stripe_subscription_id = session.subscription;
          // Pro subscription doesn't expire (managed by Stripe recurring billing)
          updateData.subscription_expires_at = null;
        } else if (subTier === "lifetime") {
          updateData.stripe_subscription_id = null;
          updateData.subscription_expires_at = null; // Never expires
        }

        if (!updateData.stripe_customer_id && session.customer) {
          updateData.stripe_customer_id = session.customer;
        }

        await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", subUserId);
      } catch (err) {
        console.error("Failed to activate subscription:", err);
      }
    }

    // ---- Handle quote payment ----
    const quoteId = session.metadata?.quote_id;
    const amount = parseFloat(session.metadata?.amount || "0");

    if (quoteId && amount > 0) {
      try {
        const supabase = getServiceClient();

        // Record the payment as confirmed (paid via Stripe)
        await supabase.from("payments").insert({
          quote_id: quoteId,
          amount: amount,
          method: "credit_card",
          notes: `Stripe payment ${session.payment_intent}`,
          status: "confirmed",
        });

        // Recalculate total paid
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, status")
          .eq("quote_id", quoteId)
          .eq("status", "confirmed");

        const totalPaid = (payments || []).reduce(
          (sum: number, p: { amount: number }) => sum + Number(p.amount),
          0
        );

        // Get quote total
        const { data: quote } = await supabase
          .from("quotes")
          .select("total_price, deposit_percentage")
          .eq("id", quoteId)
          .single();

        if (quote) {
          const totalPrice = Number(quote.total_price);
          const depositAmount =
            (Number(quote.deposit_percentage || 0) / 100) * totalPrice;

          let newStatus = "signed";
          if (totalPaid >= totalPrice - 0.01) {
            newStatus = "paid_full";
          } else if (totalPaid >= depositAmount && depositAmount > 0) {
            newStatus = "paid_deposit";
          }

          await supabase
            .from("quotes")
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", quoteId);
        }
      } catch (err) {
        console.error("Failed to record Stripe payment:", err);
      }
    }
  }

  // ---- Handle subscription cancelled / expired ----
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const userId = subscription.metadata?.user_id;

    if (userId) {
      try {
        const supabase = getServiceClient();
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            stripe_subscription_id: null,
            subscription_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      } catch (err) {
        console.error("Failed to handle subscription deletion:", err);
      }
    }
  }

  // ---- Handle subscription updated (e.g. renewal, payment failure) ----
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    const userId = subscription.metadata?.user_id;

    if (userId) {
      try {
        const supabase = getServiceClient();

        if (subscription.status === "active") {
          await supabase
            .from("profiles")
            .update({
              subscription_tier: "pro",
              subscription_expires_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
          // Grace period — keep pro but mark expiration
          const periodEnd = new Date((subscription as unknown as Record<string, unknown>).current_period_end as number * 1000);
          await supabase
            .from("profiles")
            .update({
              subscription_expires_at: periodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }
      } catch (err) {
        console.error("Failed to handle subscription update:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
