"use client";

import { History, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface EditRecord {
  id: string;
  previous_total: number;
  new_total: number;
  previous_items: { description: string; price: number }[];
  new_items: { description: string; price: number }[];
  previous_notes: string | null;
  new_notes: string | null;
  previous_deposit_percentage: number;
  new_deposit_percentage: number;
  created_at: string;
}

interface EditHistoryAccordionProps {
  editHistory: EditRecord[];
  /** "customer" = public quote page style, "contractor" = contractor detail style */
  variant?: "customer" | "contractor";
}

export default function EditHistoryAccordion({
  editHistory,
  variant = "customer",
}: EditHistoryAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!editHistory || editHistory.length === 0) return null;

  const visibleEdits = expanded ? editHistory : [editHistory[0]];
  const hasMore = editHistory.length > 1;

  if (variant === "contractor") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <button
          onClick={() => hasMore && setExpanded(!expanded)}
          className={`w-full flex items-center justify-between ${hasMore ? "cursor-pointer" : "cursor-default"}`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Edit History ({editHistory.length})
            </h2>
          </div>
          {hasMore && (
            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              {expanded ? "Collapse" : `Show all ${editHistory.length}`}
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          )}
        </button>

        <div className="mt-3 space-y-3">
          {visibleEdits.map((edit) => (
            <div key={edit.id} className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-2">
                Revised on{" "}
                {new Date(edit.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              {Number(edit.previous_total) !== Number(edit.new_total) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Total:</span>
                  <span className="line-through text-gray-400">
                    ${Number(edit.previous_total).toFixed(2)}
                  </span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="font-semibold text-gray-900">
                    ${Number(edit.new_total).toFixed(2)}
                  </span>
                </div>
              )}
              {Number(edit.previous_deposit_percentage) !==
                Number(edit.new_deposit_percentage) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Deposit:</span>
                  <span className="line-through text-gray-400">
                    {Number(edit.previous_deposit_percentage)}%
                  </span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="font-semibold text-gray-900">
                    {Number(edit.new_deposit_percentage)}%
                  </span>
                </div>
              )}
              {JSON.stringify(edit.previous_items) !==
                JSON.stringify(edit.new_items) && (
                <p className="text-xs text-gray-500 mt-1">Line items changed</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Customer variant (public quote page)
  return (
    <div className="mt-6 bg-white rounded-2xl shadow-lg overflow-hidden">
      <button
        onClick={() => hasMore && setExpanded(!expanded)}
        className={`w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between ${hasMore ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Edit History ({editHistory.length})
          </h3>
        </div>
        {hasMore && (
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            {expanded ? "Show less" : `Show all ${editHistory.length}`}
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        )}
      </button>

      <div className="divide-y divide-gray-100">
        {visibleEdits.map((edit) => (
          <div key={edit.id} className="px-6 py-4">
            <p className="text-xs text-gray-500 mb-2">
              Revised on{" "}
              {new Date(edit.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {Number(edit.previous_total) !== Number(edit.new_total) && (
              <div className="flex items-center gap-2 text-sm mb-1">
                <span className="text-gray-500">Total:</span>
                <span className="line-through text-gray-400">
                  ${Number(edit.previous_total).toFixed(2)}
                </span>
                <span className="text-gray-400">&rarr;</span>
                <span className="font-semibold text-gray-900">
                  ${Number(edit.new_total).toFixed(2)}
                </span>
              </div>
            )}
            {Number(edit.previous_deposit_percentage) !==
              Number(edit.new_deposit_percentage) && (
              <div className="flex items-center gap-2 text-sm mb-1">
                <span className="text-gray-500">Deposit:</span>
                <span className="line-through text-gray-400">
                  {Number(edit.previous_deposit_percentage)}%
                </span>
                <span className="text-gray-400">&rarr;</span>
                <span className="font-semibold text-gray-900">
                  {Number(edit.new_deposit_percentage)}%
                </span>
              </div>
            )}
            {JSON.stringify(edit.previous_items) !==
              JSON.stringify(edit.new_items) && (
              <div className="mt-2 text-xs">
                <p className="text-gray-500 font-medium mb-1">Items changed:</p>
                <div className="bg-red-50 rounded-lg p-2 mb-1">
                  {(edit.previous_items || []).map(
                    (item: { description: string; price: number }, i: number) => (
                      <div key={i} className="flex justify-between text-red-600">
                        <span className="line-through">{item.description}</span>
                        <span className="line-through">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    )
                  )}
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  {(edit.new_items || []).map(
                    (item: { description: string; price: number }, i: number) => (
                      <div key={i} className="flex justify-between text-green-700">
                        <span>{item.description}</span>
                        <span>${item.price.toFixed(2)}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
            {edit.previous_notes !== edit.new_notes && (
              <div className="mt-2 text-xs">
                <span className="text-gray-500">Notes updated</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
