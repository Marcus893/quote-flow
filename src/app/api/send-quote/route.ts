import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { quoteId } = await request.json();

    if (!quoteId) {
      return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the quote with customer and contractor info
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("*, customers(*), profiles(*)")
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const customer = quote.customers;
    const contractor = quote.profiles;
    const items = (quote.items as { description: string; price: number }[]) || [];

    if (!customer?.email) {
      return NextResponse.json(
        { error: "Customer has no email" },
        { status: 400 }
      );
    }

    // Build the public quote URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const quoteUrl = `${baseUrl}/quote/${quoteId}`;

    // Build line items HTML
    const itemsHtml = items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${item.description}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827; text-align: right; font-weight: 600;">$${item.price.toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: #111827; color: white; padding: 32px;">
              <h1 style="margin: 0 0 4px 0; font-size: 20px;">${contractor?.business_name || "QuoteFlow"}</h1>
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">${contractor?.email || ""}</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px;">
              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">Hi ${customer.name},</p>
              <p style="color: #111827; margin: 0 0 24px 0; font-size: 16px;">
                Here's your professional quote${quote.quote_name ? ` for <strong>${quote.quote_name}</strong>` : ""} from <strong>${contractor?.business_name || "us"}</strong>.
              </p>

              <!-- Items Table -->
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Description</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Total -->
              <div style="background: #111827; color: white; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <table style="width: 100%;"><tr>
                  <td style="color: white; font-size: 16px;">Total</td>
                  <td style="color: white; font-size: 24px; font-weight: bold; text-align: right;">$${Number(quote.total_price).toFixed(2)}</td>
                </tr></table>
              </div>

              ${quote.notes ? `<p style="margin: 24px 0 0 0; padding: 16px; background: #f9fafb; border-radius: 12px; color: #374151; font-size: 14px;"><strong>Notes:</strong> ${quote.notes}</p>` : ""}

              <!-- CTA -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${quoteUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">View Full Quote</a>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding: 24px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">Sent via <a href="${baseUrl}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">QuoteFlow</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: `${contractor?.business_name || "QuoteFlow"} <noreply@usequoteflow.com>`,
      to: customer.email,
      subject: `Quote${quote.quote_name ? `: ${quote.quote_name}` : ""} from ${contractor?.business_name || "QuoteFlow"} — $${Number(quote.total_price).toFixed(2)}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Update quote status to "sent"
    await supabase
      .from("quotes")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", quoteId);

    // Revalidate cached pages so dashboard shows updated status
    revalidatePath("/dashboard");
    revalidatePath(`/quotes/${quoteId}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send quote error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
