"use client";

import { createClient } from "@/lib/supabase/client";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/delete-account", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete account.";
      setError(message);
      setDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900 mb-1">Delete Your Account</p>
            <p className="text-sm text-red-800">
              This will permanently delete your account, all quotes, customers, payments, and uploaded files. This cannot be undone.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-red-800 mb-2">
            Type <span className="font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowConfirm(false);
              setConfirmText("");
              setError(null);
            }}
            disabled={deleting}
            className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || confirmText !== "DELETE"}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="w-full flex items-center justify-center gap-2 py-3 text-red-500 text-sm font-medium hover:text-red-700 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      Delete Account
    </button>
  );
}
