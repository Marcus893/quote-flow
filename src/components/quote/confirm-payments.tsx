"use client";

import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Clock, DollarSign, CreditCard, XCircle, FileText, Download } from "lucide-react";
import { useState } from "react";
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

interface ConfirmPaymentsProps {
  quoteId: string;
  totalPrice: number;
  depositPercentage: number;
  payments: Payment[];
}

export default function ConfirmPayments({
  quoteId,
  totalPrice,
  depositPercentage,
  payments: initialPayments,
}: ConfirmPaymentsProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [invalidatingId, setInvalidatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const confirmedPayments = payments.filter((p) => p.status === "confirmed");
  const totalConfirmed = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const depositAmount = (depositPercentage / 100) * totalPrice;

  const handleConfirm = async (paymentId: string) => {
    setConfirmingId(paymentId);
    setError(null);

    try {
      const supabase = createClient();

      // Update payment status to confirmed
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "confirmed" })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      // Recalculate totals after this confirmation
      const payment = payments.find((p) => p.id === paymentId);
      const newTotalConfirmed = totalConfirmed + Number(payment?.amount || 0);
      const isPaidInFull = newTotalConfirmed >= totalPrice - 0.01;
      const isDepositPaid = newTotalConfirmed >= depositAmount;

      // Update quote status based on confirmed amounts
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

      // Update local state
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: "confirmed" } : p))
      );
      setSuccessMessage(`Payment of $${Number(payment?.amount || 0).toFixed(2)} confirmed!`);
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to confirm payment.";
      setError(message);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleInvalid = async (paymentId: string) => {
    setInvalidatingId(paymentId);
    setError(null);

    try {
      const supabase = createClient();

      // Delete the invalid payment
      const { error: deleteError } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (deleteError) throw deleteError;

      const payment = payments.find((p) => p.id === paymentId);

      // Update local state — remove the invalid payment
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      setSuccessMessage(`Payment of $${Number(payment?.amount || 0).toFixed(2)} marked as invalid and removed.`);
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to mark payment as invalid.";
      setError(message);
    } finally {
      setInvalidatingId(null);
    }
  };

  if (pendingPayments.length === 0) return null;

  return (
    <div className="space-y-3">
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center font-medium">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <div className="bg-yellow-50 rounded-2xl border border-yellow-200 overflow-hidden">
        <div className="bg-yellow-100 px-5 py-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-700" />
          <h3 className="text-sm font-semibold text-yellow-800">
            Pending Payments ({pendingPayments.length})
          </h3>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-yellow-700">
            Your customer submitted these payments. Confirm each one after verifying receipt.
          </p>

          {pendingPayments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-xl border border-yellow-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-base font-semibold text-gray-900 capitalize">
                    {payment.method === "custom" ? "Direct Payment" : payment.method === "credit_card" ? "Credit Card" : payment.method === "other" ? "Direct Payment" : payment.method}
                  </p>
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
                    <p className="text-xs text-gray-400 mt-1">{payment.notes}</p>
                  )}
                  {payment.receipt_url && (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Receipt
                      <Download className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <span className="text-xl font-bold text-gray-900">
                  ${Number(payment.amount).toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => handleConfirm(payment.id)}
                disabled={confirmingId === payment.id || invalidatingId === payment.id}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {confirmingId === payment.id
                  ? "Confirming..."
                  : `Confirm $${Number(payment.amount).toFixed(2)} Received`}
              </button>

              <button
                onClick={() => handleInvalid(payment.id)}
                disabled={confirmingId === payment.id || invalidatingId === payment.id}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
              >
                <XCircle className="w-4 h-4" />
                {invalidatingId === payment.id
                  ? "Removing..."
                  : "Mark as Invalid"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
