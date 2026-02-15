"use client";

import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface TermsAccordionProps {
  termsDocument: string;
  /** "customer" = inside the quote card (px-6), "contractor" = standalone card */
  variant?: "customer" | "contractor";
}

export default function TermsAccordion({
  termsDocument,
  variant = "customer",
}: TermsAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!termsDocument) return null;

  if (variant === "contractor") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Terms & Conditions
            </h2>
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            {expanded ? "Hide" : "View"}
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>
        {expanded && (
          <div className="px-5 pb-5 pt-0 border-t border-gray-100">
            <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed pt-3">
              {termsDocument}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Customer variant (inside the quote card)
  return (
    <div className="px-6 pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Terms & Conditions
        </h2>
        <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
          {expanded ? "Hide" : "View"}
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="text-gray-600 text-sm bg-gray-50 rounded-xl p-4 whitespace-pre-wrap leading-relaxed mt-2">
          {termsDocument}
        </div>
      )}
    </div>
  );
}
