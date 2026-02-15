"use client";

import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Crown,
  Zap,
  Sparkles,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import type { SubscriptionTier } from "@/lib/subscription";

interface PlanFeature {
  text: string;
  free: boolean;
  pro: boolean;
  lifetime: boolean;
}

const features: PlanFeature[] = [
  { text: "Create quotes", free: true, pro: true, lifetime: true },
  { text: "Up to 3 quotes total", free: true, pro: false, lifetime: false },
  { text: "Unlimited quotes", free: false, pro: true, lifetime: true },
  {
    text: "3 photos maximum per item",
    free: true,
    pro: false,
    lifetime: false,
  },
  { text: "12 photos per line item", free: false, pro: true, lifetime: true },
  { text: "Custom business logo", free: false, pro: true, lifetime: true },
  {
    text: "Automated follow-up emails",
    free: false,
    pro: true,
    lifetime: true,
  },
  { text: "Invoice export / download", free: false, pro: true, lifetime: true },
  { text: "Signature & payments", free: true, pro: true, lifetime: true },
  {
    text: "Credit card payments",
    free: true,
    pro: true,
    lifetime: true,
  },
  { text: "24/7 priority support", free: false, pro: true, lifetime: true },
  { text: "Lifetime access", free: false, pro: false, lifetime: true },
];

function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelled = searchParams.get("cancelled") === "true";

  useEffect(() => {
    const loadSubscription = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      setCurrentTier(
        (profile?.subscription_tier as SubscriptionTier) || "free",
      );
      setLoading(false);
    };
    loadSubscription();
  }, [router]);

  const handleUpgrade = async (tier: "pro" | "lifetime") => {
    setUpgrading(tier);
    setError(null);
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-600 font-medium active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Plans & Pricing</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 pb-12">
        {cancelled && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm text-center">
            Checkout was cancelled. You can try again anytime.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid gap-4 md:grid-cols-3 mt-2">
          {/* Free */}
          <div
            className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${
              currentTier === "free" ? "border-gray-400" : "border-gray-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900">Free</h2>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">$0</p>
            <p className="text-sm text-gray-500 mb-5">Get started for free</p>

            <ul className="space-y-2.5 flex-1 mb-6">
              {features
                .filter((f) => f.free)
                .map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {f.text}
                  </li>
                ))}
              {features
                .filter((f) => !f.free && (f.pro || f.lifetime))
                .map((f, i) => (
                  <li
                    key={`no-${i}`}
                    className="flex items-start gap-2 text-sm text-gray-400"
                  >
                    <X className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                    {f.text}
                  </li>
                ))}
            </ul>

            {currentTier === "free" ? (
              <div className="py-3 text-center text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl">
                Current Plan
              </div>
            ) : (
              <div className="py-3 text-center text-sm text-gray-400">—</div>
            )}
          </div>

          {/* Pro */}
          <div
            className={`bg-white rounded-2xl border-2 p-6 flex flex-col relative ${
              currentTier === "pro"
                ? "border-blue-500 shadow-lg shadow-blue-100"
                : "border-blue-200"
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              Popular
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Pro</h2>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">
              $15
              <span className="text-base font-medium text-gray-500">/mo</span>
            </p>
            <p className="text-sm text-gray-500 mb-5">Everything you need</p>

            <ul className="space-y-2.5 flex-1 mb-6">
              {features
                .filter((f) => f.pro)
                .map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    {f.text}
                  </li>
                ))}
            </ul>

            {currentTier === "pro" ? (
              <div className="py-3 text-center text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl">
                Current Plan
              </div>
            ) : currentTier === "lifetime" ? (
              <div className="py-3 text-center text-sm text-gray-400">—</div>
            ) : (
              <button
                onClick={() => handleUpgrade("pro")}
                disabled={!!upgrading}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {upgrading === "pro" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Upgrade to Pro"
                )}
              </button>
            )}
          </div>

          {/* Lifetime */}
          <div
            className={`bg-white rounded-2xl border-2 p-6 flex flex-col relative ${
              currentTier === "lifetime"
                ? "border-amber-500 shadow-lg shadow-amber-100"
                : "border-amber-200"
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              Best Value
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900">Lifetime</h2>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">$129</p>
            <p className="text-sm text-gray-500 mb-5">One-time, forever</p>

            <ul className="space-y-2.5 flex-1 mb-6">
              {features
                .filter((f) => f.lifetime)
                .map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {f.text}
                  </li>
                ))}
            </ul>

            {currentTier === "lifetime" ? (
              <div className="py-3 text-center text-sm font-semibold text-amber-600 bg-amber-50 rounded-xl">
                Current Plan
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade("lifetime")}
                disabled={!!upgrading}
                className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {upgrading === "lifetime" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Get Lifetime Access"
                )}
              </button>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-10 bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">FAQ</h2>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Can I cancel my Pro subscription?
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Yes, you can cancel anytime from Settings. You keep Pro access
              until the end of your billing period.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              What happens if I hit the free quote limit?
            </p>
            <p className="text-sm text-gray-500 mt-1">
              You can still view and manage your existing quotes, but
              you&apos;ll need to upgrade to create new ones.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Is the Lifetime plan really one-time?
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Yes! Pay once, get every feature forever — including all future
              updates.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              Can I upgrade from Pro to Lifetime?
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Absolutely. Your Pro subscription will be cancelled and
              you&apos;ll get lifetime access immediately.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionContent />
    </Suspense>
  );
}
