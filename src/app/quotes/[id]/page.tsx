import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Copy,
  MessageSquare,
  Clock,
  Eye,
  CheckCircle,
  DollarSign,
  FileText,
  ExternalLink,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import CopyLinkButton from "./copy-link-button";
import TextLinkButton from "./text-link-button";
import SendQuoteButton from "./send-quote-button";
import DeleteQuoteButton from "./delete-quote-button";
import ConfirmPayments from "@/components/quote/confirm-payments";
import ClickablePhotoGrid from "@/components/clickable-photo-grid";
import ItemsWithPhotos from "@/components/quote/items-with-photos";
import EditHistoryAccordion from "@/components/quote/edit-history-accordion";
import TermsAccordion from "@/components/quote/terms-accordion";
import DownloadInvoice from "@/components/quote/download-invoice";
import { isPaidTier, type SubscriptionTier } from "@/lib/subscription";

interface QuoteDetailProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: <Clock className="w-4 h-4" /> },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: <Send className="w-4 h-4" /> },
  viewed: { label: "Viewed", color: "bg-yellow-100 text-yellow-700", icon: <Eye className="w-4 h-4" /> },
  signed: { label: "Signed", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-4 h-4" /> },
  paid_deposit: { label: "Deposit Paid", color: "bg-emerald-100 text-emerald-700", icon: <DollarSign className="w-4 h-4" /> },
  paid_full: { label: "Paid in Full", color: "bg-emerald-100 text-emerald-700", icon: <DollarSign className="w-4 h-4" /> },
};

export default async function QuoteDetailPage({ params }: QuoteDetailProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(*)")
    .eq("id", id)
    .eq("contractor_id", user.id)
    .single();

  if (!quote) redirect("/dashboard");

  // Get contractor profile for business info
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, email, phone, logo_url, terms_document, subscription_tier")
    .eq("id", user.id)
    .single();

  const contractorTier = (profile?.subscription_tier || "free") as SubscriptionTier;
  const canExportInvoice = isPaidTier(contractorTier);

  // Fetch payments for this quote
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("quote_id", id)
    .order("created_at", { ascending: true });

  // Fetch edit history (non-blocking if table doesn't exist)
  let editHistory: Record<string, unknown>[] | null = null;
  try {
    const { data } = await supabase
      .from("quote_edits")
      .select("*")
      .eq("quote_id", id)
      .order("created_at", { ascending: false });
    editHistory = data;
  } catch {
    // quote_edits table may not exist yet
  }

  const customer = quote.customers;
  const items = (quote.items as { description: string; price: number; photos?: string[] }[]) || [];
  const photos = (quote.photos as string[]) || [];
  const status = statusConfig[quote.status] || statusConfig.draft;
  const confirmedPayments = (payments || []).filter((p: { status?: string }) => p.status === "confirmed");
  const pendingPayments = (payments || []).filter((p: { status?: string }) => p.status === "pending");
  const totalPaid = confirmedPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
  const totalPending = pendingPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
  const remainingBalance = Number(quote.total_price) - totalPaid;
  const depositPercentage = Number(quote.deposit_percentage) || 0;
  const depositAmount = (depositPercentage / 100) * Number(quote.total_price);

  const baseUrl = (await import("@/lib/url")).getBaseUrl();
  const quoteUrl = `${baseUrl}/quote/${id}`;
  const smsBody = encodeURIComponent(
    `Hi ${customer?.name || "there"}, here is your professional quote for ${quote.quote_name || "your project"}: ${quoteUrl}`
  );
  const smsLink = customer?.phone
    ? `sms:${customer.phone}?&body=${smsBody}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-gray-600 font-medium active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Quote Details</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-8 space-y-4">
        {/* Business Info */}
        {profile && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              {profile.logo_url ? (
                <Image
                  src={profile.logo_url}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {profile.business_name?.charAt(0) || "Q"}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{profile.business_name}</p>
                <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {profile.email && <span>{profile.email}</span>}
                  {profile.phone && <span>{profile.phone}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status + Customer Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
              {status.icon}
              {status.label}
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${Number(quote.total_price).toFixed(2)}
            </span>
          </div>
          <div>
            {quote.quote_name && (
              <p className="text-base font-medium text-gray-600 mb-1">
                {quote.quote_name}
              </p>
            )}
            <p className="text-lg font-semibold text-gray-900">
              {customer?.name || "Unknown Customer"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
              {customer?.email && <span>{customer.email}</span>}
              {customer?.phone && <span>{customer.phone}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Created{" "}
              {new Date(quote.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Signature Info */}
        {quote.signature_data && (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Customer Signed</span>
            </div>
            <p className="text-lg font-serif italic text-green-900">{quote.signature_data}</p>
          </div>
        )}

        {/* Payment Summary */}
        {(payments && payments.length > 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Payment Summary
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Quote</span>
                <span className="font-semibold text-gray-900">${Number(quote.total_price).toFixed(2)}</span>
              </div>
              {totalPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Confirmed Payments</span>
                  <span className="font-semibold text-green-600">-${totalPaid.toFixed(2)}</span>
                </div>
              )}
              {totalPending > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Pending Confirmation</span>
                  <span className="font-semibold text-yellow-600">${totalPending.toFixed(2)}</span>
                </div>
              )}
              {depositPercentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Deposit ({depositPercentage}%)</span>
                  <span className={`font-medium ${totalPaid >= depositAmount ? "text-green-600" : "text-orange-600"}`}>
                    ${depositAmount.toFixed(2)} {totalPaid >= depositAmount ? "✓" : "(pending)"}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Remaining</span>
                  <span className={`text-lg font-bold ${remainingBalance <= 0.01 ? "text-green-600" : "text-gray-900"}`}>
                    ${Math.max(remainingBalance, 0).toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((totalPaid / Number(quote.total_price)) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Payment history */}
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payments</p>
              {payments.map((payment: { id: string; amount: number; method: string; notes: string | null; receipt_url?: string | null; status?: string; created_at: string }) => (
                <div key={payment.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {payment.method === "credit_card" ? "Credit Card" : payment.method === "other" ? "Direct Payment" : payment.method === "custom" ? "Direct Payment" : payment.method}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(payment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {payment.notes && <span className="text-xs text-gray-400 ml-2">{payment.notes}</span>}
                      {payment.receipt_url && (
                        <a
                          href={payment.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 ml-2 font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          Receipt
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${payment.status === "confirmed" ? "text-green-600" : "text-yellow-600"}`}>
                      +${Number(payment.amount).toFixed(2)}
                    </span>
                    {payment.status === "pending" && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deposit Info (no payments yet) */}
        {depositPercentage > 0 && (!payments || payments.length === 0) && (
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Deposit Required</p>
                <p className="text-xs text-blue-600">{depositPercentage}% of total</p>
              </div>
              <span className="text-lg font-bold text-blue-800">${depositAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Line Items & Photos (interactive — click item to filter photos) */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Line Items
            </h2>
            <ItemsWithPhotos items={items} allPhotos={photos} />
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes
            </h2>
            <p className="text-gray-700 text-sm">{quote.notes}</p>
          </div>
        )}

        {/* Terms & Conditions (foldable) */}
        {profile?.terms_document && (
          <TermsAccordion termsDocument={profile.terms_document} variant="contractor" />
        )}

        {/* Edit History (foldable) */}
        {editHistory && editHistory.length > 0 && (
          <EditHistoryAccordion
            editHistory={editHistory.map((raw) => {
              const e = raw as {
                id: string;
                previous_total: number;
                new_total: number;
                previous_items: { description: string; price: number }[];
                new_items: { description: string; price: number }[];
                previous_notes: string | null;
                new_notes: string | null;
                previous_deposit_percentage: number;
                new_deposit_percentage: number;
                created_at: string;
              };
              return e;
            })}
            variant="contractor"
          />
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {/* Edit quote — hidden when paid in full */}
          {quote.status !== "paid_full" && (
            <Link
              href={`/quotes/${id}/edit`}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
            >
              <Pencil className="w-5 h-5" />
              Edit Quote
            </Link>
          )}

          {/* Send / resend quote (if draft or already sent) */}
          {(quote.status === "draft" || quote.status === "sent") && (
            <SendQuoteButton quoteId={id} isDraft={quote.status === "draft"} />
          )}

          {/* Copy Link */}
          <CopyLinkButton quoteId={id} />

          {/* Text Link - SMS Bypass (not for drafts) */}
          {smsLink && quote.status !== "draft" && (
            <TextLinkButton smsLink={smsLink} customerName={customer?.name} />
          )}

          {/* View public quote */}
          <Link
            href={`/quote/${id}`}
            target="_blank"
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <ExternalLink className="w-5 h-5" />
            Preview Public Quote
          </Link>

          {/* Confirm Pending Payments (customer-submitted payments awaiting confirmation) */}
          {quote.signature_data && (
            <ConfirmPayments
              quoteId={id}
              totalPrice={Number(quote.total_price)}
              depositPercentage={depositPercentage}
              payments={(payments || []).map((p: { id: string; amount: number; method: string; notes: string | null; receipt_url: string | null; status?: string; created_at: string }) => ({
                ...p,
                status: p.status || "confirmed",
              }))}
            />
          )}

          {/* Download Invoice — available when paid in full */}
          {quote.status === "paid_full" && canExportInvoice && (
            <DownloadInvoice
              businessName={profile?.business_name || ""}
              businessEmail={profile?.email}
              businessPhone={profile?.phone}
              logoUrl={profile?.logo_url}
              customerName={customer?.name || "Customer"}
              customerEmail={customer?.email}
              customerPhone={customer?.phone}
              quoteName={quote.quote_name}
              items={items}
              totalPrice={Number(quote.total_price)}
              payments={(payments || []).map((p: { amount: number; method: string; notes: string | null; status?: string; created_at: string }) => ({
                ...p,
                status: p.status || "confirmed",
              }))}
              createdAt={quote.created_at}
              signatureData={quote.signature_data}
              notes={quote.notes}
              depositPercentage={depositPercentage}
            />
          )}
          {quote.status === "paid_full" && !canExportInvoice && (
            <Link
              href="/subscription"
              className="flex items-center justify-center gap-2 w-full bg-gray-50 border border-gray-200 text-gray-600 rounded-xl px-4 py-3.5 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Invoice Download
              <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Pro</span>
            </Link>
          )}

          {/* Delete Quote — hidden when paid in full */}
          {quote.status !== "paid_full" && (
            <DeleteQuoteButton quoteId={id} quoteName={quote.quote_name || "this quote"} />
          )}
        </div>
      </main>
    </div>
  );
}
