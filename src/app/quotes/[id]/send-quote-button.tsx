"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SendQuoteButtonProps {
  quoteId: string;
  isDraft: boolean;
}

export default function SendQuoteButton({
  quoteId,
  isDraft,
}: SendQuoteButtonProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    setSending(true);
    try {
      await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      setSent(true);
      router.refresh();
    } catch {
      // Silently handle
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700 font-semibold">
        <Send className="w-5 h-5" />
        Quote Sent!
      </div>
    );
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending}
      className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
    >
      <Send className="w-5 h-5" />
      {sending
        ? "Sending..."
        : isDraft
          ? "Send Quote"
          : "Resend Quote"}
    </button>
  );
}
