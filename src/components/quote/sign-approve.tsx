"use client";

import { createClient } from "@/lib/supabase/client";
import { CheckCircle, PenTool } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SignApproveProps {
  quoteId: string;
  customerName: string;
}

export default function SignApprove({ quoteId, customerName }: SignApproveProps) {
  const router = useRouter();
  const [typedName, setTypedName] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    if (!typedName.trim()) {
      setError("Please type your full name to sign.");
      return;
    }

    setSigning(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          signature_data: typedName.trim(),
          status: "signed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", quoteId);

      if (updateError) throw updateError;

      setSigned(true);
      // Refresh the page to show updated state
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign quote.";
      setError(message);
    } finally {
      setSigning(false);
    }
  };

  if (signed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-green-900 mb-1">Quote Signed!</h3>
        <p className="text-sm text-green-700">
          You have successfully approved this quote.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
      <div className="bg-gray-900 text-white px-6 py-4">
        <div className="flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          <h3 className="text-lg font-bold">Sign & Approve</h3>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          Type your full name below to approve this quote
        </p>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Legal Name
          </label>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={customerName || "Type your full name"}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Signature Preview */}
        {typedName.trim() && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Signature Preview</p>
            <p className="text-2xl font-serif italic text-gray-900">
              {typedName}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          By signing, you agree to the terms and pricing outlined in this quote. This constitutes your electronic signature and approval.
        </p>

        <button
          onClick={handleSign}
          disabled={signing || !typedName.trim()}
          className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
        >
          <CheckCircle className="w-5 h-5" />
          {signing ? "Signing..." : "Sign & Approve Quote"}
        </button>
      </div>
    </div>
  );
}
