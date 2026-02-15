import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Default follow-up intervals (used when contractor has no custom config)
const DEFAULT_FOLLOW_UP_INTERVALS = [
  { days: 2, enabled: true },
  { days: 7, enabled: true },
  { days: 15, enabled: true },
];

// Map interval days to the boolean field on the quotes table
function getFollowUpField(days: number): string {
  if (days === 2) return "follow_up_2d";
  if (days === 7) return "follow_up_7d";
  if (days === 15) return "follow_up_15d";
  // For custom intervals, use a generic field name stored as JSON
  return `follow_up_custom_${days}d`;
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let emailsSent = 0;

  try {
    // Fetch all quotes that are "viewed" (but not signed/paid) with their contractor + customer info
    const { data: quotes, error } = await supabase
      .from("quotes")
      .select("*, customers(name, email), profiles(business_name, email, subscription_tier, follow_up_intervals, follow_up_subject, follow_up_message)")
      .eq("status", "viewed")
      .not("viewed_at", "is", null);

    if (error) throw error;
    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ success: true, emailsSent: 0, message: "No follow-ups needed" });
    }

    const now = new Date();

    for (const quote of quotes) {
      const viewedAt = new Date(quote.viewed_at);
      const daysSinceViewed = (now.getTime() - viewedAt.getTime()) / (1000 * 60 * 60 * 24);

      const customer = quote.customers;
      const contractor = quote.profiles;

      if (!customer?.email || !contractor?.email) continue;

      // Skip follow-ups for free tier users (Pro/Lifetime feature only)
      const contractorTier = (contractor as Record<string, unknown>).subscription_tier as string || "free";
      if (contractorTier === "free") continue;

      // Use contractor's custom intervals or the defaults
      const contractorIntervals = (contractor as Record<string, unknown>).follow_up_intervals as { days: number; enabled: boolean }[] || DEFAULT_FOLLOW_UP_INTERVALS;
      const customSubject = (contractor as Record<string, unknown>).follow_up_subject as string | null;
      const customMessage = (contractor as Record<string, unknown>).follow_up_message as string | null;
      const enabledIntervals = contractorIntervals.filter((i) => i.enabled);

      // Track which follow-ups have been sent via a JSON field
      const followUpsSent = (quote.follow_ups_sent as Record<string, boolean>) || {};

      for (const interval of enabledIntervals) {
        const fieldKey = getFollowUpField(interval.days);

        // Check both legacy boolean fields and the new JSON tracking
        const alreadySent = quote[fieldKey] === true || followUpsSent[fieldKey] === true;

        // Check if we've passed this interval and haven't sent the follow-up yet
        if (daysSinceViewed >= interval.days && !alreadySent) {
          // Send follow-up email to the customer
          const quoteName = quote.quote_name || "your quote";
          const quoteUrl = `${baseUrl}/quote/${quote.id}`;
          const businessName = contractor.business_name || "your contractor";
          const customerName = customer.name || "there";
          const dayLabel = interval.days <= 2 ? "a couple of days" : interval.days <= 7 ? "a week" : interval.days <= 14 ? "two weeks" : `${interval.days} days`;

          // Build subject line
          let subject: string;
          if (customSubject) {
            subject = customSubject
              .replace(/{customer_name}/g, customerName)
              .replace(/{quote_name}/g, quoteName)
              .replace(/{business_name}/g, businessName);
          } else {
            subject = interval.days <= 2
              ? `Quick reminder about "${quoteName}"`
              : interval.days <= 7
              ? `Your quote for "${quoteName}" is still waiting`
              : `Final reminder: "${quoteName}" quote expires soon`;
          }

          // Build email body
          let bodyHtml: string;
          if (customMessage) {
            const formattedMessage = customMessage
              .replace(/{customer_name}/g, customerName)
              .replace(/{quote_name}/g, quoteName)
              .replace(/{business_name}/g, businessName)
              .replace(/{quote_url}/g, quoteUrl)
              .replace(/\n/g, "<br />");

            bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 32px; text-align: center;">
        <p style="margin: 0; font-size: 36px;">👋</p>
        <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700;">Just Checking In</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          ${formattedMessage}
        </p>
        <div style="text-align: center;">
          <a href="${quoteUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">Review Your Quote</a>
        </div>
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">Sent on behalf of ${businessName} via <a href="${baseUrl}" style="color: #3b82f6; text-decoration: none;">QuoteFlow</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
          } else {
            // Default email template
            const defaultBody = interval.days <= 2
              ? "If you have any questions, now is a great time to reach out. The quote is ready for your approval whenever you are!"
              : interval.days <= 7
              ? "We wanted to make sure you didn't miss this. Your quote is still available and waiting for your review."
              : "This is a final reminder — your quote is still open. Don't miss out on getting this project started!";

            bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 32px; text-align: center;">
        <p style="margin: 0; font-size: 36px;">👋</p>
        <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700;">Just Checking In</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${customerName},
        </p>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
          It's been ${dayLabel} since you viewed the quote for <strong>${quoteName}</strong> from <strong>${businessName}</strong>.
        </p>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          ${defaultBody}
        </p>
        <div style="text-align: center;">
          <a href="${quoteUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">Review Your Quote</a>
        </div>
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">Sent on behalf of ${businessName} via <a href="${baseUrl}" style="color: #3b82f6; text-decoration: none;">QuoteFlow</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
          }

          try {
            await resend.emails.send({
              from: `${businessName} <onboarding@resend.dev>`,
              to: customer.email,
              subject,
              html: bodyHtml,
            });

            // Mark this follow-up as sent using both legacy fields and new tracking
            const updateData: Record<string, unknown> = {};

            // Update legacy boolean field if it's one of the standard intervals
            if (["follow_up_2d", "follow_up_7d", "follow_up_15d"].includes(fieldKey)) {
              updateData[fieldKey] = true;
            }

            // Also update the JSON tracking field for custom intervals
            updateData.follow_ups_sent = { ...followUpsSent, [fieldKey]: true };

            await supabase
              .from("quotes")
              .update(updateData)
              .eq("id", quote.id);

            emailsSent++;
          } catch (emailErr) {
            console.error(`Failed to send ${fieldKey} follow-up for quote ${quote.id}:`, emailErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent });
  } catch (err) {
    console.error("Follow-up cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
