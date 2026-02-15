// ============================================
// Subscription tier definitions
// ============================================

export type SubscriptionTier = "free" | "pro" | "lifetime";

export interface TierLimits {
  maxQuotes: number;         // total quotes allowed
  maxPhotosPerItem: number;  // photos per line item
  customLogo: boolean;       // can upload/display custom logo
  followUpEmails: boolean;   // automated follow-up emails
  invoiceExport: boolean;    // download PDF invoice
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxQuotes: 3,
    maxPhotosPerItem: 3,
    customLogo: false,
    followUpEmails: false,
    invoiceExport: false,
  },
  pro: {
    maxQuotes: Infinity,
    maxPhotosPerItem: 12,
    customLogo: true,
    followUpEmails: true,
    invoiceExport: true,
  },
  lifetime: {
    maxQuotes: Infinity,
    maxPhotosPerItem: 12,
    customLogo: true,
    followUpEmails: true,
    invoiceExport: true,
  },
};

export const TIER_DISPLAY: Record<SubscriptionTier, { name: string; price: string; badge: string; color: string }> = {
  free: { name: "Free", price: "$0", badge: "Free", color: "bg-gray-100 text-gray-600" },
  pro: { name: "Pro", price: "$15/mo", badge: "Pro", color: "bg-blue-100 text-blue-700" },
  lifetime: { name: "Lifetime", price: "$129", badge: "Lifetime", color: "bg-amber-100 text-amber-700" },
};

// Stripe Price IDs — set these in environment variables
// STRIPE_PRO_PRICE_ID: recurring $15/mo price
// STRIPE_LIFETIME_PRICE_ID: one-time $129 price

export function getTierLimits(tier: string | null | undefined): TierLimits {
  const t = (tier || "free") as SubscriptionTier;
  return TIER_LIMITS[t] || TIER_LIMITS.free;
}

export function isPaidTier(tier: string | null | undefined): boolean {
  return tier === "pro" || tier === "lifetime";
}
