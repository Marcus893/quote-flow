"use client";

import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Send, Save, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getTierLimits } from "@/lib/subscription";
import { trackQuoteCreated, trackQuoteSent } from "@/lib/analytics";

import CustomerInfo from "@/components/quote/customer-info";
import LineItemsEditor, {
  type LineItem,
} from "@/components/quote/line-items-editor";

export default function NewQuotePage() {
  const router = useRouter();
  const supabase = createClient();

  // Subscription state
  const [tier, setTier] = useState<string>("free");
  const [quoteLimitReached, setQuoteLimitReached] = useState(false);
  const limits = getTierLimits(tier);

  useEffect(() => {
    const checkSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      const t = profile?.subscription_tier || "free";
      setTier(t);
      const tierLimits = getTierLimits(t);
      if (tierLimits.maxQuotes !== Infinity) {
        const { count } = await supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("contractor_id", user.id);
        if ((count || 0) >= tierLimits.maxQuotes) {
          setQuoteLimitReached(true);
        }
      }
    };
    checkSubscription();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Customer state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  // Photos state (removed — now per line item)

  // Quote name
  const [quoteName, setQuoteName] = useState("");

  // Line items state — start with one empty row
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", price: "", photos: [], previews: [], existingPhotoUrls: [] },
  ]);

  // Notes
  const [notes, setNotes] = useState("");

  // Deposit percentage
  const [depositPercentage, setDepositPercentage] = useState("");

  // UI state
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingSend, setSavingSend] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saving = savingDraft || savingSend;

  const handleCustomerChange = (
    field: "name" | "email" | "phone",
    value: string
  ) => {
    // Clear selected customer when manually editing
    setSelectedCustomerId(null);
    if (field === "name") setCustomerName(value);
    if (field === "email") setCustomerEmail(value);
    if (field === "phone") setCustomerPhone(value);
  };

  const total = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.price) || 0);
  }, 0);

  const isValid =
    quoteName.trim() &&
    customerName.trim() &&
    customerEmail.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) &&
    customerPhone.trim() &&
    /^[+]?[\d\s\-()]{7,}$/.test(customerPhone.trim()) &&
    lineItems.some((item) => item.description.trim() && item.price);

  const handleSave = async (asDraft: boolean) => {
    // Only validate required fields when sending, not drafting
    if (!asDraft) {
      if (!quoteName.trim()) {
        setError("Please give this quote a name.");
        return;
      }
      if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
        setError("Please fill in customer name, email, and phone number.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!/^[+]?[\d\s\-()]{7,}$/.test(customerPhone.trim())) {
        setError("Please enter a valid phone number (at least 7 digits).");
        return;
      }
      if (!lineItems.some((item) => item.description.trim() && item.price)) {
        setError("Please add at least one line item with description and price.");
        return;
      }
    }

    if (asDraft) {
      setSavingDraft(true);
    } else {
      setSavingSend(true);
    }
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // 1. Create or reuse customer
      let custId: string;

      if (selectedCustomerId) {
        // Reuse existing customer — update their info in case it changed
        const { error: custErr } = await supabase
          .from("customers")
          .update({
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim() || null,
          })
          .eq("id", selectedCustomerId);
        if (custErr) throw custErr;
        custId = selectedCustomerId;
      } else {
        const { data: customer, error: custErr } = await supabase
          .from("customers")
          .insert({
            contractor_id: user.id,
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim() || null,
          })
          .select()
          .single();
        if (custErr) throw custErr;
        custId = customer.id;
      }

      // 2. Upload photos per line item and prepare items JSON
      const itemsJson = [];
      const allPhotoUrls: string[] = [];
      for (const item of lineItems) {
        if (!item.description.trim() && !item.price) continue;
        const itemPhotoUrls: string[] = [];
        for (const file of item.photos) {
          const fileExt = file.name.split(".").pop();
          const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
          const { error: upErr } = await supabase.storage
            .from("quote-photos")
            .upload(filePath, file);
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from("quote-photos").getPublicUrl(filePath);
          itemPhotoUrls.push(publicUrl);
          allPhotoUrls.push(publicUrl);
        }
        itemsJson.push({
          description: item.description.trim(),
          price: parseFloat(item.price) || 0,
          photos: itemPhotoUrls,
        });
      }

      // 3. Create quote
      const { data: quote, error: quoteErr } = await supabase
        .from("quotes")
        .insert({
          contractor_id: user.id,
          customer_id: custId,
          quote_name: quoteName.trim() || null,
          items: itemsJson,
          total_price: total,
          deposit_percentage: parseFloat(depositPercentage) || 0,
          status: asDraft ? "draft" : "sent",
          photos: allPhotoUrls,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (quoteErr) throw quoteErr;

      // Track quote creation
      trackQuoteCreated(quote.id, itemsJson.length, total);

      // Navigate based on action
      if (asDraft) {
        router.push("/dashboard");
      } else {
        trackQuoteSent(quote.id);
        // Send email via API route
        try {
          await fetch("/api/send-quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quoteId: quote.id }),
          });
        } catch {
          // Email failure shouldn't block the flow
        }
        router.push(`/quotes/${quote.id}/success`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setSavingDraft(false);
      setSavingSend(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-600 font-medium active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">New Quote</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto p-4 pb-36 space-y-6">
        {quoteLimitReached && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <Lock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-800 mb-1">Free plan limit reached</p>
            <p className="text-xs text-amber-600 mb-3">You&apos;ve used all {limits.maxQuotes} free quotes. Upgrade to create unlimited quotes.</p>
            <Link
              href="/subscription"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Upgrade Now
            </Link>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Section 1: Quote Name */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Quote Name *
          </label>
          <input
            type="text"
            value={quoteName}
            onChange={(e) => setQuoteName(e.target.value)}
            placeholder="e.g. Kitchen faucet repair, Bathroom remodel..."
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
          />
        </div>

        {/* Section 2: Customer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <CustomerInfo
            name={customerName}
            email={customerEmail}
            phone={customerPhone}
            onChange={handleCustomerChange}
            onSelectExisting={(customer) => setSelectedCustomerId(customer.id)}
          />
        </div>

        {/* Section 3: Line Items (with per-item photos) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <LineItemsEditor items={lineItems} onChange={setLineItems} maxPhotosPerItem={limits.maxPhotosPerItem} />
        </div>

        {/* Section 4: Deposit Percentage */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            Deposit Required (optional)
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Set a deposit percentage the customer must pay upfront
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={depositPercentage}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                const num = parseFloat(val);
                if (val === "" || (num >= 0 && num <= 100)) {
                  setDepositPercentage(val);
                }
              }}
              placeholder="0"
              className="w-24 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
            />
            <span className="text-gray-500 font-medium">%</span>
            {depositPercentage && parseFloat(depositPercentage) > 0 && total > 0 && (
              <span className="text-sm text-green-700 font-medium bg-green-50 px-3 py-1.5 rounded-lg">
                = ${((parseFloat(depositPercentage) / 100) * total).toFixed(2)} deposit
              </span>
            )}
          </div>
        </div>

        {/* Section 5: Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes for the customer..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      </main>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-10">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving || quoteLimitReached}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving || !isValid || quoteLimitReached}
            className="flex-[2] flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
          >
            <Send className="w-5 h-5" />
            {savingSend ? "Sending..." : "Send Quote"}
          </button>
        </div>
      </div>
    </div>
  );
}
