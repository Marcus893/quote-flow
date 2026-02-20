import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use service role client — this API is called from a public page with no auth context
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { quoteId } = await request.json();

    if (!quoteId) {
      return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: quote } = await supabase
      .from("quotes")
      .select("*, customers(name, email), profiles(business_name, email)")
      .eq("id", quoteId)
      .single();

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const contractor = quote.profiles;
    const customer = quote.customers;

    if (!contractor?.email) {
      return NextResponse.json({ error: "Contractor has no email" }, { status: 400 });
    }

    const customerName = customer?.name || "Your customer";
    const customerEmail = customer?.email || "";
    const quoteName = quote.quote_name || "your quote";
    const { getBaseUrl } = await import("@/lib/url");
    const baseUrl = getBaseUrl();
    const quoteUrl = `${baseUrl}/quotes/${quoteId}`;
    const publicQuoteUrl = `${baseUrl}/quote/${quoteId}`;

    // Build mailto link for follow-up email
    const businessName = contractor?.business_name || "your contractor";
    const followUpSubject = encodeURIComponent(`Following up on your quote — ${quoteName}`);
    const followUpBody = encodeURIComponent(
      `Hi ${customer?.name || "there"},\n\nI wanted to follow up on the quote I sent you for ${quoteName}. If you have any questions or would like to discuss the details, I'd be happy to help.\n\nYou can view your quote here: ${publicQuoteUrl}\n\nLooking forward to hearing from you!\n\nBest regards,\n${businessName}`
    );
    const mailtoLink = `mailto:${customerEmail}?subject=${followUpSubject}&body=${followUpBody}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 32px; text-align: center;">
              <p style="margin: 0; font-size: 36px;">💥</p>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700;">Quote Opened!</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                <strong>${customerName}</strong> just opened your quote for <strong>${quoteName}</strong>.
              </p>
              <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                Now is a great time to follow up! A quick message while the quote is fresh in their mind can make all the difference.
              </p>
              <div style="text-align: center;">
                <a href="${quoteUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">View Quote Details</a>
              </div>
              <div style="text-align: center; margin-top: 12px;">
                <a href="${mailtoLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">📧 Send Follow Up Email</a>
              </div>
            </div>
            <div style="padding: 16px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">Sent by <a href="${baseUrl}" style="color: #3b82f6; text-decoration: none;">QuoteFlow</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: `QuoteFlow <noreply@usequoteflow.com>`,
      to: contractor.email,
      subject: `💥 ${customerName} just opened "${quoteName}"`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Quote view notification error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
