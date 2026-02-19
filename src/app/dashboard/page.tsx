import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FileText, Plus, Clock, Eye, CheckCircle, DollarSign, Send, Settings, AlertCircle, History, Crown, Sparkles, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import SignOutButton from "./sign-out-button";
import { TIER_DISPLAY, TIER_LIMITS, isPaidTier, type SubscriptionTier } from "@/lib/subscription";
import IdentifyUser from "@/components/identify-user";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: <Clock className="w-3.5 h-3.5" /> },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: <Send className="w-3.5 h-3.5" /> },
  viewed: { label: "Viewed", color: "bg-yellow-100 text-yellow-700", icon: <Eye className="w-3.5 h-3.5" /> },
  signed: { label: "Signed", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  paid_deposit: { label: "Deposit Paid", color: "bg-emerald-100 text-emerald-700", icon: <DollarSign className="w-3.5 h-3.5" /> },
  paid_full: { label: "Paid in Full", color: "bg-emerald-100 text-emerald-700", icon: <DollarSign className="w-3.5 h-3.5" /> },
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.business_name) {
    redirect("/onboarding");
  }

  // Fetch quotes with customer info
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*, customers(name, email)")
    .eq("contractor_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch pending payments for all quotes to show badges
  const quoteIds = (quotes || []).map((q) => q.id);
  let pendingPaymentCounts: Record<string, number> = {};
  if (quoteIds.length > 0) {
    const { data: pendingPayments } = await supabase
      .from("payments")
      .select("quote_id")
      .in("quote_id", quoteIds)
      .eq("status", "pending");
    if (pendingPayments) {
      pendingPaymentCounts = pendingPayments.reduce((acc: Record<string, number>, p: { quote_id: string }) => {
        acc[p.quote_id] = (acc[p.quote_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  const hasQuotes = quotes && quotes.length > 0;
  const activeQuotes = (quotes || []).filter((q) => q.status !== "paid_full");
  const completedQuotes = (quotes || []).filter((q) => q.status === "paid_full");

  // Subscription info
  const tier = (profile.subscription_tier || "free") as SubscriptionTier;
  const tierDisplay = TIER_DISPLAY[tier];
  const tierLimits = TIER_LIMITS[tier];
  const totalQuotes = (quotes || []).length;
  const isFreeTier = tier === "free";
  const quoteLimitReached = isFreeTier && totalQuotes >= tierLimits.maxQuotes;

  // Helper to render a quote card
  const renderQuoteCard = (quote: typeof quotes extends (infer T)[] | null ? T : never) => {
    const status = statusConfig[quote.status] || statusConfig.draft;
    const customerName = quote.customers?.name || "Unknown Customer";
    const qName = quote.quote_name || "Untitled Quote";
    const date = new Date(quote.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const pendingCount = pendingPaymentCounts[quote.id] || 0;

    return (
      <Link
        key={quote.id}
        href={`/quotes/${quote.id}`}
        className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md active:scale-[0.99] transition-all"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-gray-900 text-base truncate">
            {qName}
          </span>
          <span className="text-lg font-bold text-gray-900 ml-2 shrink-0">
            ${Number(quote.total_price).toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-2 truncate">{customerName}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.icon}
              {status.label}
            </div>
            {pendingCount > 0 && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                <AlertCircle className="w-3 h-3" />
                {pendingCount} payment{pendingCount > 1 ? "s" : ""} to confirm
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400">{date}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <IdentifyUser
        userId={user.id}
        email={profile.email}
        businessName={profile.business_name}
        tier={tier}
      />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile.logo_url && isPaidTier(tier) ? (
              <Image
                src={profile.logo_url}
                alt="Logo"
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {profile.business_name?.charAt(0) || "Q"}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900">
                  {profile.business_name}
                </h1>
                <Link href="/subscription" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tierDisplay.color}`}>
                  {tier !== "free" && <Crown className="w-3 h-3" />}
                  {tierDisplay.badge}
                </Link>
              </div>
              <p className="text-xs text-gray-500">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="mailto:marcus@usequoteflow.com"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Contact Support"
            >
              <Mail className="w-5 h-5" />
            </a>
            <Link
              href="/settings"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto p-6">
        {/* New Quote CTA */}
        <div className="mb-6">
          {isFreeTier && (
            <div className="mb-3 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
              <span className="text-sm text-gray-600">
                {totalQuotes}/{tierLimits.maxQuotes} quotes used
              </span>
              {quoteLimitReached ? (
                <Link href="/subscription" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Upgrade to unlock more →
                </Link>
              ) : (
                <span className="text-xs text-gray-400">{tierLimits.maxQuotes - totalQuotes} remaining</span>
              )}
            </div>
          )}
          <Link
            href={quoteLimitReached ? "/subscription" : "/quotes/new"}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-5 text-lg font-semibold active:scale-[0.98] transition-all shadow-lg ${
              quoteLimitReached
                ? "bg-gray-400 text-white shadow-gray-400/20"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
            }`}
          >
            {quoteLimitReached ? (
              <>
                <Sparkles className="w-6 h-6" />
                Upgrade to Create More Quotes
              </>
            ) : (
              <>
                <Plus className="w-6 h-6" />
                New Quote
              </>
            )}
          </Link>
        </div>

        {hasQuotes ? (
          <>
            {/* Active Quotes */}
            {activeQuotes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Active Quotes ({activeQuotes.length})
                </h2>
                <div className="space-y-3">
                  {activeQuotes.map(renderQuoteCard)}
                </div>
              </div>
            )}

            {/* Completed / History */}
            {completedQuotes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    History ({completedQuotes.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {completedQuotes.map(renderQuoteCard)}
                </div>
              </div>
            )}

            {/* Show message when only history exists */}
            {activeQuotes.length === 0 && completedQuotes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center mb-6">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">All jobs complete! Create a new quote to get started.</p>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              No quotes yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create your first professional quote in under 60 seconds
            </p>
            <Link
              href="/quotes/new"
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create your first quote
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
