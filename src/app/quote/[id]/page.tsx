import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { FileText, Phone, Mail, CheckCircle, DollarSign } from "lucide-react";
import ClickablePhotoGrid from "@/components/clickable-photo-grid";
import ItemsWithPhotos from "@/components/quote/items-with-photos";
import SignApprove from "@/components/quote/sign-approve";
import PaymentFlow from "@/components/quote/payment-flow";
import EditHistoryAccordion from "@/components/quote/edit-history-accordion";
import TermsAccordion from "@/components/quote/terms-accordion";
import DownloadInvoice from "@/components/quote/download-invoice";
import { isPaidTier, type SubscriptionTier } from "@/lib/subscription";

interface QuotePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}

export default async function PublicQuotePage({ params, searchParams }: QuotePageProps) {
  const { id } = await params;
  const { payment: paymentStatus } = await searchParams;
  const supabase = await createClient();

  // Fetch quote with customer and contractor profile
  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(*), profiles(*)")
    .eq("id", id)
    .single();

  if (!quote) {
    notFound();
  }

  // Mark as viewed if currently "sent" and notify contractor
  if (quote.status === "sent") {
    await supabase
      .from("quotes")
      .update({ status: "viewed", viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);

    // Send view notification email to contractor (non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    try {
      fetch(`${baseUrl}/api/quote-viewed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: id }),
      }).catch(() => {});
    } catch {
      // Notification failure shouldn't block the page
    }
  }

  const contractor = quote.profiles;
  const contractorTier = (contractor?.subscription_tier || "free") as SubscriptionTier;
  const canExportInvoice = isPaidTier(contractorTier);
  const customer = quote.customers;
  const items = (quote.items as { description: string; price: number; photos?: string[] }[]) || [];
  const photos = (quote.photos as string[]) || [];
  const paymentLinks = (contractor?.payment_links as Record<string, string>) || {};
  const depositPercentage = Number(quote.deposit_percentage) || 0;
  const depositAmount = (depositPercentage / 100) * Number(quote.total_price);

  // Fetch payments for this quote
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("quote_id", id)
    .order("created_at", { ascending: true });

  const totalPaid = (payments || [])
    .filter((p: { status?: string }) => p.status === "confirmed")
    .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
  const paidInFull = totalPaid >= Number(quote.total_price) - 0.01;
  const isSigned = !!quote.signature_data;
  const canSign = !isSigned && ["sent", "viewed"].includes(quote.status);
  const canPay = isSigned && !paidInFull;
  const remainingBalance = Number(quote.total_price) - totalPaid;
  const depositPaid = totalPaid >= depositAmount;

  // Check actual Stripe Connect status (not just whether ID exists)
  let stripeEnabled = false;
  if (contractor?.stripe_account_id) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(contractor.stripe_account_id);
      stripeEnabled = account.charges_enabled === true && account.payouts_enabled === true;
    } catch {
      stripeEnabled = false;
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-4 py-8">
        {/* Quote Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 text-white px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {contractor?.logo_url ? (
                  <Image
                    src={contractor.logo_url}
                    alt="Logo"
                    width={48}
                    height={48}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {contractor?.business_name?.charAt(0) || "Q"}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold">
                    {contractor?.business_name || "QuoteFlow"}
                  </h1>
                  {contractor?.email && (
                    <p className="text-gray-400 text-sm">{contractor.email}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                  Quote
                </span>
              </div>
            </div>

            {/* Customer */}
            <div className="border-t border-gray-700 pt-4">
              {quote.quote_name && (
                <p className="text-blue-400 text-sm font-medium mb-2">
                  {quote.quote_name}
                </p>
              )}
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                Prepared for
              </p>
              <p className="text-lg font-semibold">
                {customer?.name || "Customer"}
              </p>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                {customer?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {customer.email}
                  </span>
                )}
                {customer?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {customer.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Line Items & Photos (interactive — click item to filter photos) */}
          {items.length > 0 && (
            <div className="px-6 pt-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Itemized Breakdown
              </h2>
              <ItemsWithPhotos items={items} allPhotos={photos} />
            </div>
          )}

          {/* Total */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center justify-between bg-gray-900 text-white rounded-xl px-5 py-4">
              <span className="text-base font-medium">Total</span>
              <span className="text-2xl font-bold">
                ${Number(quote.total_price).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Deposit Info */}
          {depositPercentage > 0 && (
            <div className="px-6 pt-2">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
                <span className="text-sm font-medium text-blue-800">
                  Deposit Required ({depositPercentage}%)
                </span>
                <span className="text-lg font-bold text-blue-800">
                  ${depositAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div className="px-6 pt-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Notes
              </h2>
              <p className="text-gray-700 text-sm bg-gray-50 rounded-xl p-4">
                {quote.notes}
              </p>
            </div>
          )}

          {/* Terms & Conditions (foldable) */}
          {contractor?.terms_document && (
            <TermsAccordion termsDocument={contractor.terms_document} variant="customer" />
          )}

          {/* Signature Display (if already signed) */}
          {isSigned && (
            <div className="px-6 pt-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Quote Approved</span>
                </div>
                <p className="text-xl font-serif italic text-green-900 mb-1">
                  {quote.signature_data}
                </p>
                <p className="text-xs text-green-700">
                  Signed on {new Date(quote.updated_at || quote.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-6 mt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-400">
                Sent via{" "}
                <a
                  href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  QuoteFlow
                </a>
                {" "}•{" "}
                {new Date(quote.updated_at || quote.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {(quote.edit_version && quote.edit_version > 1) && (
                  <span className="ml-1">• Revision {quote.edit_version}</span>
                )}
              </p>
            </div>
          </div>
        </div>

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
            variant="customer"
          />
        )}

        {/* Stripe payment result banner */}
        {paymentStatus === "success" && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-800">Payment successful!</p>
            <p className="text-xs text-green-600 mt-1">Your credit card payment has been processed.</p>
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-yellow-800">Payment was cancelled. You can try again below.</p>
          </div>
        )}

        {/* Sign & Approve Section (below the card) */}
        {canSign && (
          <div className="mt-6">
            {editHistory && editHistory.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-sm font-medium text-amber-800">
                  This quote has been revised. Please review the updated details above and sign again to approve.
                </p>
              </div>
            )}
            <SignApprove quoteId={id} customerName={customer?.name || ""} />
          </div>
        )}

        {/* Payment Flow (customer submits payments, contractor confirms) */}
        {canPay && (
          <div className="mt-6">
            <PaymentFlow
              quoteId={id}
              totalPrice={Number(quote.total_price)}
              depositPercentage={depositPercentage}
              paymentLinks={paymentLinks}
              existingPayments={(payments || []).map((p: { id: string; amount: number; method: string; notes: string | null; receipt_url: string | null; status?: string; created_at: string }) => ({
                ...p,
                status: p.status || "confirmed",
              }))}
              currentStatus={quote.status}
              stripeEnabled={stripeEnabled}
            />
          </div>
        )}

        {/* Paid in full badge (shown when not canPay) */}
        {isSigned && paidInFull && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-900 mb-1">Paid in Full</h3>
            <p className="text-green-700 text-lg font-semibold">${totalPaid.toFixed(2)}</p>
          </div>
        )}

        {/* Download Invoice — available when paid in full */}
        {isSigned && paidInFull && canExportInvoice && (
          <div className="mt-4">
            <DownloadInvoice
              businessName={contractor?.business_name || ""}
              businessEmail={contractor?.email}
              businessPhone={contractor?.phone}
              logoUrl={contractor?.logo_url}
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
          </div>
        )}
      </div>
    </div>
  );
}
