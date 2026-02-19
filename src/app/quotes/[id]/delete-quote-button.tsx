"use client";

import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteQuoteButtonProps {
  quoteId: string;
  quoteName: string;
}

export default function DeleteQuoteButton({ quoteId, quoteName }: DeleteQuoteButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const supabase = createClient();

      // Get the quote to find the contractor ID and photos
      const { data: quote } = await supabase
        .from("quotes")
        .select("contractor_id, items, photos")
        .eq("id", quoteId)
        .single();

      // Delete receipt files from payment-receipts bucket
      const { data: receiptFiles } = await supabase.storage
        .from("payment-receipts")
        .list(quoteId);
      if (receiptFiles && receiptFiles.length > 0) {
        await supabase.storage
          .from("payment-receipts")
          .remove(receiptFiles.map((f) => `${quoteId}/${f.name}`));
      }

      // Delete quote photo files from quote-photos bucket
      if (quote) {
        const photoUrls: string[] = [];
        // Collect item-level photos
        const items = (quote.items as { photos?: string[] }[]) || [];
        for (const item of items) {
          if (item.photos) photoUrls.push(...item.photos);
        }
        // Collect top-level photos
        const topPhotos = (quote.photos as string[]) || [];
        photoUrls.push(...topPhotos);

        if (photoUrls.length > 0) {
          // Extract storage paths from public URLs
          const pathsToDelete = photoUrls
            .map((url) => {
              const match = url.match(/quote-photos\/(.+)/);
              return match ? match[1] : null;
            })
            .filter((p): p is string => p !== null);
          if (pathsToDelete.length > 0) {
            await supabase.storage.from("quote-photos").remove(pathsToDelete);
          }
        }
      }

      // Delete payments first (cascade should handle this, but be explicit)
      await supabase.from("payments").delete().eq("quote_id", quoteId);

      // Delete the quote
      const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 space-y-3">
        <p className="text-sm text-red-800 font-medium text-center">
          Delete &quot;{quoteName}&quot;? This will permanently remove the quote and all payment records. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            disabled={deleting}
            className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="w-full flex items-center justify-center gap-2 py-4 border-2 border-red-200 rounded-xl text-red-600 font-semibold hover:bg-red-50 active:scale-[0.98] transition-all"
    >
      <Trash2 className="w-5 h-5" />
      Delete Quote
    </button>
  );
}
