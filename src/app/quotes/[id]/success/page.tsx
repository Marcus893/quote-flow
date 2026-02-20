import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  CheckCircle,
  Send,
  MessageSquare,
  ArrowLeft,
  Copy,
} from "lucide-react";
import Link from "next/link";
import CopyLinkButton from "./copy-link-button";
import TextLinkButton from "./text-link-button";
import AutoTextRedirect from "./auto-text-redirect";

interface SuccessPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteSuccessPage({ params }: SuccessPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get quote with customer
  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(*)")
    .eq("id", id)
    .eq("contractor_id", user.id)
    .single();

  if (!quote) redirect("/dashboard");

  const customer = quote.customers;
  const baseUrl = (await import("@/lib/url")).getBaseUrl();
  const quoteUrl = `${baseUrl}/quote/${id}`;
  const smsBody = encodeURIComponent(
    `Hi ${customer?.name || "there"}, here is your professional quote for ${quote.quote_name || "your project"}: ${quoteUrl}`
  );
  const smsLink = customer?.phone
    ? `sms:${customer.phone}?&body=${smsBody}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      {/* Auto-text redirect: opens SMS app automatically */}
      {smsLink && <AutoTextRedirect smsLink={smsLink} />}

      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Quote Sent!
        </h1>
        <p className="text-gray-500 mb-8">
          Your quote for{" "}
          <span className="font-semibold text-gray-700">
            ${Number(quote.total_price).toFixed(2)}
          </span>{" "}
          has been created for{" "}
          <span className="font-semibold text-gray-700">
            {customer?.name || "your customer"}
          </span>
          .
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Copy quote link */}
          <CopyLinkButton quoteId={id} />

          {/* Text Link - SMS Bypass per mission.md */}
          {smsLink && (
            <TextLinkButton smsLink={smsLink} customerName={customer?.name} />
          )}

          {/* Back to dashboard */}
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-4 text-gray-600 font-medium hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
