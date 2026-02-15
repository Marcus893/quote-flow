"use client";

import { MessageSquare } from "lucide-react";

interface TextLinkButtonProps {
  smsLink: string;
  customerName?: string;
}

export default function TextLinkButton({
  smsLink,
  customerName,
}: TextLinkButtonProps) {
  return (
    <a
      href={smsLink}
      className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg shadow-green-600/20"
    >
      <MessageSquare className="w-5 h-5" />
      Text Link to {customerName || "Customer"}
    </a>
  );
}
