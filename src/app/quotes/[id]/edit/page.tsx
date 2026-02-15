"use client";

import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Send } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getTierLimits, type SubscriptionTier } from "@/lib/subscription";

import CustomerInfo from "@/components/quote/customer-info";
import LineItemsEditor, {
  type LineItem,
} from "@/components/quote/line-items-editor";

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const supabase = createClient();

  // Loading state
  const [loading, setLoading] = useState(true);
  const [originalStatus, setOriginalStatus] = useState<string>("draft");

  // Store original quote data for edit history
  const [originalItems, setOriginalItems] = useState<{ description: string; price: number }[]>([]);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  const [originalDepositPercentage, setOriginalDepositPercentage] = useState(0);
  const [wasSigned, setWasSigned] = useState(false);

  // Customer state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Photos state (removed — now per line item)

  // Quote name
  const [quoteName, setQuoteName] = useState("");

  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Notes
  const [notes, setNotes] = useState("");

  // Deposit percentage
  const [depositPercentage, setDepositPercentage] = useState("");

  // UI state
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingSend, setSavingSend] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saving = savingDraft || savingSend;

  // Subscription tier
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const limits = getTierLimits(tier);

  // Load existing quote data
  useEffect(() => {
    const loadQuote = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load subscription tier
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      if (profile?.subscription_tier) {
        setTier(profile.subscription_tier as SubscriptionTier);
      }

      const { data: quote } = await supabase
        .from("quotes")
        .select("*, customers(*)")
        .eq("id", quoteId)
        .eq("contractor_id", user.id)
        .single();

      if (!quote) {
        router.push("/dashboard");
        return;
      }

      // Prevent editing completed (paid in full) quotes
      if (quote.status === "paid_full") {
        router.push(`/quotes/${quoteId}`);
        return;
      }

      setOriginalStatus(quote.status);
      setCustomerId(quote.customer_id);

      // Track if quote was signed (for re-sign logic)
      setWasSigned(!!quote.signature_data);

      // Store original data for edit history comparison
      const origItems = (quote.items as { description: string; price: number }[]) || [];
      setOriginalItems(origItems);
      setOriginalTotal(Number(quote.total_price));
      setOriginalNotes(quote.notes || null);
      setOriginalDepositPercentage(Number(quote.deposit_percentage) || 0);

      // Quote name
      setQuoteName(quote.quote_name || "");

      // Customer info
      const customer = quote.customers;
      if (customer) {
        setCustomerName(customer.name || "");
        setCustomerEmail(customer.email || "");
        setCustomerPhone(customer.phone || "");
      }

      // Photos — now per line item (no separate state needed)

      // Line items (with per-item photos)
      const items =
        (quote.items as { description: string; price: number; photos?: string[] }[]) || [];
      setLineItems(
        items.length > 0
          ? items.map((item) => ({
              id: crypto.randomUUID(),
              description: item.description,
              price: item.price.toString(),
              photos: [],
              previews: [],
              existingPhotoUrls: item.photos || [],
            }))
          : [{ id: crypto.randomUUID(), description: "", price: "", photos: [], previews: [], existingPhotoUrls: [] }]
      );

      // Notes
      setNotes(quote.notes || "");

      // Deposit percentage
      setDepositPercentage(quote.deposit_percentage ? quote.deposit_percentage.toString() : "");

      setLoading(false);
    };

    loadQuote();
  }, [quoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCustomerChange = (
    field: "name" | "email" | "phone",
    value: string
  ) => {
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
    if (!asDraft) {
      if (!quoteName.trim()) {
        setError("Please give this quote a name.");
        return;
      }
      if (
        !customerName.trim() ||
        !customerEmail.trim() ||
        !customerPhone.trim()
      ) {
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
        setError(
          "Please add at least one line item with description and price."
        );
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

      // 1. Update customer
      if (customerId) {
        const { error: custErr } = await supabase
          .from("customers")
          .update({
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim() || null,
          })
          .eq("id", customerId);

        if (custErr) throw custErr;
      }

      // 2. Upload photos per line item and prepare items JSON
      const itemsJson = [];
      const allPhotoUrls: string[] = [];
      for (const item of lineItems) {
        if (!item.description.trim() && !item.price) continue;
        const itemPhotoUrls: string[] = [...item.existingPhotoUrls];
        allPhotoUrls.push(...item.existingPhotoUrls);
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

      // 3. Combine all photo URLs for global photos field
      // (allPhotoUrls already populated above)

      // 4. Determine new status
      let newStatus = originalStatus;
      if (asDraft) {
        newStatus = "draft";
      } else {
        newStatus = "sent";
      }

      // 5. Check if quote content actually changed (for edit history)
      const contentChanged =
        JSON.stringify(itemsJson) !== JSON.stringify(originalItems) ||
        total !== originalTotal ||
        (notes.trim() || null) !== originalNotes ||
        (parseFloat(depositPercentage) || 0) !== originalDepositPercentage;

      // 6. If sending a previously sent/signed quote with changes, record edit history
      if (!asDraft && contentChanged && originalStatus !== "draft") {
        try {
          await supabase.from("quote_edits").insert({
            quote_id: quoteId,
            previous_items: originalItems,
            new_items: itemsJson,
            previous_total: originalTotal,
            new_total: total,
            previous_notes: originalNotes,
            new_notes: notes.trim() || null,
            previous_deposit_percentage: originalDepositPercentage,
            new_deposit_percentage: parseFloat(depositPercentage) || 0,
          });
        } catch {
          // quote_edits table may not exist yet — skip
        }
      }

      // 7. If the quote was signed and content changed, clear signature so customer must re-sign
      const shouldClearSignature = wasSigned && contentChanged && !asDraft;

      // 8. Update quote
      const updateData: Record<string, unknown> = {
        quote_name: quoteName.trim() || null,
        items: itemsJson,
        total_price: total,
        deposit_percentage: parseFloat(depositPercentage) || 0,
        status: newStatus,
        photos: allPhotoUrls,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (shouldClearSignature) {
        updateData.signature_data = null;
      }

      // Increment edit version if content changed (non-blocking if column doesn't exist)
      if (contentChanged && !asDraft) {
        try {
          const { data: versionData } = await supabase
            .from("quotes")
            .select("edit_version")
            .eq("id", quoteId)
            .single();
          if (versionData && "edit_version" in versionData) {
            updateData.edit_version = ((versionData as Record<string, unknown>).edit_version as number || 1) + 1;
          }
        } catch {
          // edit_version column may not exist yet — skip
        }
      }

      const { error: quoteErr } = await supabase
        .from("quotes")
        .update(updateData)
        .eq("id", quoteId);

      if (quoteErr) {
        // If error is about edit_version column, retry without it
        if (quoteErr.message?.includes("edit_version")) {
          delete updateData.edit_version;
          const { error: retryErr } = await supabase
            .from("quotes")
            .update(updateData)
            .eq("id", quoteId);
          if (retryErr) throw retryErr;
        } else {
          throw quoteErr;
        }
      }

      // Navigate based on action
      if (asDraft) {
        router.push(`/quotes/${quoteId}`);
      } else {
        // Send email via API route
        try {
          await fetch("/api/send-quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quoteId }),
          });
        } catch {
          // Email failure shouldn't block the flow
        }
        router.push(`/quotes/${quoteId}/success`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-lg">
          Loading quote...
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-bold text-gray-900">Edit Quote</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto p-4 pb-36 space-y-6">
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

        {/* Section 1: Customer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <CustomerInfo
            name={customerName}
            email={customerEmail}
            phone={customerPhone}
            onChange={handleCustomerChange}
          />
        </div>

        {/* Section 2: Line Items (with per-item photos) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <LineItemsEditor items={lineItems} onChange={setLineItems} maxPhotosPerItem={limits.maxPhotosPerItem} />
        </div>

        {/* Section 3: Deposit Percentage */}
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

        {/* Section 4: Notes */}
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
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving || !isValid}
            className="flex-[2] flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
          >
            <Send className="w-5 h-5" />
            {savingSend ? "Sending..." : wasSigned ? "Update & Resend (requires re-sign)" : "Update & Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
