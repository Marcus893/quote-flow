"use client";

import { createClient } from "@/lib/supabase/client";
import { DollarSign, CreditCard, ExternalLink, CheckCircle, Banknote, ArrowRight, Clock, Upload, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Payment {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  receipt_url: string | null;
  status: string;
  created_at: string;
}

interface PaymentFlowProps {
  quoteId: string;
  totalPrice: number;
  depositPercentage: number;
  paymentLinks: Record<string, string>;
  existingPayments: Payment[];
  currentStatus: string;
  stripeEnabled: boolean;
}

// Icon and label mappings for payment methods
const methodConfig: Record<string, { label: string; icon: React.ReactNode; getUrl: (value: string) => string | null }> = {
  venmo: {
    label: "Venmo",
    icon: <DollarSign className="w-5 h-5" />,
    getUrl: (v) => v.startsWith("http") ? v : `https://venmo.com/${v.replace("@", "")}`,
  },
  zelle: {
    label: "Zelle",
    icon: <Banknote className="w-5 h-5" />,
    getUrl: () => null,
  },
  paypal: {
    label: "PayPal",
    icon: <CreditCard className="w-5 h-5" />,
    getUrl: (v) => v.startsWith("http") ? v : `https://paypal.me/${v}`,
  },
  cashapp: {
    label: "Cash App",
    icon: <DollarSign className="w-5 h-5" />,
    getUrl: (v) => v.startsWith("http") ? v : `https://cash.app/${v.replace("$", "$")}`,
  },
};

export default function PaymentFlow({
  quoteId,
  totalPrice,
  depositPercentage,
  paymentLinks,
  existingPayments: initialPayments,
  currentStatus,
  stripeEnabled,
}: PaymentFlowProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Only count confirmed payments toward balance
  const confirmedPayments = payments.filter((p) => p.status === "confirmed");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const totalConfirmed = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingBalance = totalPrice - totalConfirmed;
  const depositAmount = (depositPercentage / 100) * totalPrice;
  const depositPaid = totalConfirmed >= depositAmount;
  const paidInFull = remainingBalance <= 0.01;

  const isFirstPayment = confirmedPayments.length === 0 && pendingPayments.length === 0;
  const showDepositOption = depositPercentage > 0 && !depositPaid;
  const suggestedAmount = showDepositOption
    ? (depositAmount - totalConfirmed)
    : remainingBalance;

  useEffect(() => {
    if (showPaymentOptions && !paymentAmount) {
      setPaymentAmount(suggestedAmount.toFixed(2));
    }
  }, [showPaymentOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    if (amount > remainingBalance + 0.01) {
      setError(`Payment amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`);
      return;
    }
    if (!selectedMethod) {
      setError("Please select a payment method.");
      return;
    }

    setConfirmingPayment(true);
    setError(null);

    try {
      // If credit card, redirect to Stripe Checkout
      if (selectedMethod === "credit_card") {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteId, amount }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create checkout session");
        window.location.href = data.url;
        return;
      }

      const supabase = createClient();

      // Upload receipt file if provided
      let receiptUrl: string | null = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split(".").pop();
        const fileName = `${quoteId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(fileName, receiptFile);
        if (uploadError) throw new Error("Failed to upload receipt: " + uploadError.message);
        const { data: urlData } = supabase.storage
          .from("payment-receipts")
          .getPublicUrl(fileName);
        receiptUrl = urlData.publicUrl;
      }

      // Insert payment as PENDING — contractor will confirm
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          quote_id: quoteId,
          amount: amount,
          method: selectedMethod,
          notes: paymentNotes.trim() || null,
          receipt_url: receiptUrl,
          status: "pending",
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update local state
      setPayments((prev) => [...prev, payment]);
      setSuccessMessage(`Payment of $${amount.toFixed(2)} submitted! Your contractor will confirm receipt.`);
      setShowPaymentOptions(false);
      setShowCustomAmount(false);
      setSelectedMethod(null);
      setPaymentAmount("");
      setPaymentNotes("");
      setReceiptFile(null);

      router.refresh();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit payment.";
      setError(message);
    } finally {
      setConfirmingPayment(false);
    }
  };

  // If paid in full, show completion
  if (paidInFull) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-green-900 mb-1">Paid in Full</h3>
          <p className="text-green-700 text-lg font-semibold">${totalConfirmed.toFixed(2)}</p>
        </div>
        {payments.length > 0 && <PaymentHistory payments={payments} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center font-medium">
          {successMessage}
        </div>
      )}

      {/* Payment Summary Bar */}
      {payments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Payment Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Quote</span>
              <span className="font-semibold text-gray-900">${totalPrice.toFixed(2)}</span>
            </div>
            {totalConfirmed > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Confirmed Payments</span>
                <span className="font-semibold text-green-600">-${totalConfirmed.toFixed(2)}</span>
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
                <span className={`font-medium ${depositPaid ? "text-green-600" : "text-orange-600"}`}>
                  ${depositAmount.toFixed(2)} {depositPaid ? "✓" : "(pending)"}
                </span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Remaining Balance</span>
                <span className="text-xl font-bold text-gray-900">${remainingBalance.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((totalConfirmed / totalPrice) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && <PaymentHistory payments={payments} />}

      {/* Pay Button or Payment Options */}
      {!showPaymentOptions ? (
        <button
          onClick={() => setShowPaymentOptions(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
        >
          <DollarSign className="w-5 h-5" />
          {showDepositOption
            ? `Pay Deposit — $${(depositAmount - totalConfirmed).toFixed(2)} remaining`
            : `Make Payment — $${remainingBalance.toFixed(2)} remaining`}
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 text-white px-6 py-4">
            <h3 className="text-lg font-bold">Make a Payment</h3>
            <p className="text-gray-400 text-sm mt-1">
              {showDepositOption
                ? `Deposit remaining: $${(depositAmount - totalConfirmed).toFixed(2)} of $${depositAmount.toFixed(2)} (${depositPercentage}%)`
                : `Remaining balance: $${remainingBalance.toFixed(2)}`}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* Amount Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount
              </label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {showDepositOption && (
                  <button
                    onClick={() => {
                      setPaymentAmount((depositAmount - totalConfirmed).toFixed(2));
                      setShowCustomAmount(false);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      paymentAmount === (depositAmount - totalConfirmed).toFixed(2) && !showCustomAmount
                        ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                        : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                    }`}
                  >
                    Deposit (${(depositAmount - totalConfirmed).toFixed(2)})
                  </button>
                )}
                <button
                  onClick={() => {
                    setPaymentAmount(remainingBalance.toFixed(2));
                    setShowCustomAmount(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    paymentAmount === remainingBalance.toFixed(2) && !showCustomAmount
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                  }`}
                >
                  Full Balance (${remainingBalance.toFixed(2)})
                </button>
                <button
                  onClick={() => {
                    setShowCustomAmount(true);
                    setPaymentAmount("");
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showCustomAmount
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                  }`}
                >
                  Custom
                </button>
              </div>

              {showCustomAmount && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-lg font-medium">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      setPaymentAmount(val);
                    }}
                    placeholder="0.00"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                {Object.entries(paymentLinks).map(([key, value]) => {
                  // Skip custom_name / custom_link keys, we handle them together
                  if (key === "custom_name" || key === "custom_link") return null;
                  if (!value) return null;

                  const config = methodConfig[key];
                  const label = config?.label || key;
                  const icon = config?.icon || <CreditCard className="w-5 h-5" />;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMethod(key)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                        selectedMethod === key
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedMethod === key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                      }`}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{label}</p>
                        <p className="text-sm text-gray-500 truncate">{value}</p>
                      </div>
                      {selectedMethod === key && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  );
                })}

                {/* Custom payment method */}
                {paymentLinks.custom_name && paymentLinks.custom_link && (
                  <button
                    onClick={() => setSelectedMethod("custom")}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                      selectedMethod === "custom"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedMethod === "custom" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                    }`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{paymentLinks.custom_name}</p>
                      <p className="text-sm text-gray-500 truncate">{paymentLinks.custom_link}</p>
                    </div>
                    {selectedMethod === "custom" && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                )}

                {/* Credit / Debit Card (only if contractor has Stripe) */}
                {stripeEnabled && (
                <button
                  onClick={() => setSelectedMethod("credit_card")}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                    selectedMethod === "credit_card"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedMethod === "credit_card" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                  }`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Credit / Debit Card</p>
                    <p className="text-sm text-gray-500">Pay securely with Stripe</p>
                  </div>
                  {selectedMethod === "credit_card" && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </button>
                )}

                {/* Always show a "Direct / Other" option as fallback */}
                <button
                  onClick={() => setSelectedMethod("other")}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                    selectedMethod === "other"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedMethod === "other" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                  }`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Direct Payment</p>
                    <p className="text-sm text-gray-500">Cash, check, bank transfer, etc.</p>
                  </div>
                  {selectedMethod === "other" && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Payment Link - External redirect */}
            {selectedMethod && selectedMethod !== "other" && selectedMethod !== "credit_card" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Send ${paymentAmount || "0.00"} via {
                    selectedMethod === "custom"
                      ? paymentLinks.custom_name
                      : methodConfig[selectedMethod]?.label || selectedMethod
                  }:
                </p>
                {(() => {
                  const value = selectedMethod === "custom"
                    ? paymentLinks.custom_link
                    : paymentLinks[selectedMethod];
                  const config = methodConfig[selectedMethod];
                  const url = config?.getUrl(value || "") || null;

                  if (url) {
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                      >
                        Open {methodConfig[selectedMethod]?.label || selectedMethod}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    );
                  }

                  return (
                    <p className="text-sm text-blue-700 font-mono bg-white rounded-lg px-3 py-2 border border-blue-100">
                      {value}
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Payment notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Notes (optional)
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Confirmation number, reference..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Receipt (optional)
              </label>
              {receiptFile ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-800 truncate flex-1">{receiptFile.name}</span>
                  <button
                    onClick={() => setReceiptFile(null)}
                    className="text-xs text-red-600 font-medium hover:underline flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Tap to attach receipt image or PDF</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          setError("Receipt file must be under 10MB.");
                          return;
                        }
                        setReceiptFile(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Confirm + Cancel buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPaymentOptions(false);
                  setShowCustomAmount(false);
                  setSelectedMethod(null);
                  setPaymentAmount("");
                  setError(null);
                }}
                className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={confirmingPayment || !selectedMethod || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
              >
                <CheckCircle className="w-5 h-5" />
                {confirmingPayment ? "Processing..." : selectedMethod === "credit_card" ? `Pay $${paymentAmount || "0.00"} with Card` : `Submit $${paymentAmount || "0.00"} Payment`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentHistory({ payments }: { payments: Payment[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Payment History
      </h3>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {payment.method === "custom" ? "Direct Payment" : payment.method === "credit_card" ? "Credit Card" : payment.method === "other" ? "Direct Payment" : payment.method}
                </p>
                {payment.status === "pending" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Confirmed
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {new Date(payment.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              {payment.notes && (
                <p className="text-xs text-gray-400 mt-0.5">{payment.notes}</p>
              )}
              {payment.receipt_url && (
                <a
                  href={payment.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium"
                >
                  <FileText className="w-3 h-3" />
                  View Receipt
                </a>
              )}
            </div>
            <span className={`font-semibold ${payment.status === "confirmed" ? "text-green-600" : "text-yellow-600"}`}>
              +${Number(payment.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
