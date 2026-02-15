"use client";

import { createClient } from "@/lib/supabase/client";
import { DollarSign, CheckCircle, Banknote } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface RecordPaymentProps {
  quoteId: string;
  totalPrice: number;
  depositPercentage: number;
  totalPaid: number;
}

export default function RecordPayment({
  quoteId,
  totalPrice,
  depositPercentage,
  totalPaid: initialTotalPaid,
}: RecordPaymentProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const remainingBalance = totalPrice - initialTotalPaid;
  const depositAmount = (depositPercentage / 100) * totalPrice;
  const isFirstPayment = initialTotalPaid === 0;

  const suggestedAmount = isFirstPayment && depositPercentage > 0
    ? depositAmount
    : remainingBalance;

  useEffect(() => {
    if (showForm && !paymentAmount) {
      setPaymentAmount(suggestedAmount.toFixed(2));
    }
  }, [showForm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    if (amount > remainingBalance + 0.01) {
      setError(`Amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`);
      return;
    }
    if (!paymentMethod.trim()) {
      setError("Please enter a payment method.");
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          quote_id: quoteId,
          amount: amount,
          method: paymentMethod.trim(),
          notes: paymentNotes.trim() || null,
          status: "confirmed",
        });

      if (paymentError) throw paymentError;

      // Calculate new status
      const newTotalPaid = initialTotalPaid + amount;
      const isPaidInFull = newTotalPaid >= totalPrice - 0.01;
      const isDepositPaid = newTotalPaid >= depositAmount;

      let newStatus = "signed";
      if (isPaidInFull) {
        newStatus = "paid_full";
      } else if (isDepositPaid) {
        newStatus = "paid_deposit";
      }

      await supabase
        .from("quotes")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", quoteId);

      setSuccessMessage(`Payment of $${amount.toFixed(2)} recorded!`);
      setShowForm(false);
      setShowCustomAmount(false);
      setPaymentAmount("");
      setPaymentMethod("");
      setPaymentNotes("");

      router.refresh();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record payment.";
      setError(message);
    } finally {
      setConfirming(false);
    }
  };

  if (remainingBalance <= 0.01) return null;

  return (
    <div className="space-y-3">
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center font-medium">
          {successMessage}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg shadow-green-600/20"
        >
          <DollarSign className="w-5 h-5" />
          {isFirstPayment && depositPercentage > 0
            ? `Record Deposit — $${depositAmount.toFixed(2)}`
            : `Record Payment — $${remainingBalance.toFixed(2)} remaining`}
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 text-white px-6 py-4">
            <h3 className="text-lg font-bold">Record Payment Received</h3>
            <p className="text-gray-400 text-sm mt-1">
              Remaining balance: ${remainingBalance.toFixed(2)}
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
                {isFirstPayment && depositPercentage > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentAmount(depositAmount.toFixed(2));
                      setShowCustomAmount(false);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      paymentAmount === depositAmount.toFixed(2) && !showCustomAmount
                        ? "bg-green-100 text-green-700 border-2 border-green-300"
                        : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                    }`}
                  >
                    Deposit (${depositAmount.toFixed(2)})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmount(remainingBalance.toFixed(2));
                    setShowCustomAmount(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    paymentAmount === remainingBalance.toFixed(2) && !showCustomAmount
                      ? "bg-green-100 text-green-700 border-2 border-green-300"
                      : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                  }`}
                >
                  Full Balance (${remainingBalance.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomAmount(true);
                    setPaymentAmount("");
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showCustomAmount
                      ? "bg-green-100 text-green-700 border-2 border-green-300"
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
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g. Venmo, Zelle, Cash, Check..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Confirmation #, check number..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Confirm + Cancel */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setShowCustomAmount(false);
                  setPaymentAmount("");
                  setPaymentMethod("");
                  setPaymentNotes("");
                  setError(null);
                }}
                className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || !paymentMethod.trim() || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
              >
                <CheckCircle className="w-5 h-5" />
                {confirming ? "Recording..." : `Record $${paymentAmount || "0.00"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
