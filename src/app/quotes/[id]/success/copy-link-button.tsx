"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export default function CopyLinkButton({ quoteId }: { quoteId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/quote/${quoteId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center justify-center gap-2 py-4 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
    >
      {copied ? (
        <>
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-5 h-5" />
          Copy Quote Link
        </>
      )}
    </button>
  );
}
