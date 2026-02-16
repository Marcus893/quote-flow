import posthog from "posthog-js";

// ─── Conversion Events ───
export function trackSignup(method: string = "google") {
  posthog.capture("user_signed_up", { method });
}

export function trackOnboardingComplete(businessName: string) {
  posthog.capture("onboarding_completed", { business_name: businessName });
}

export function trackQuoteCreated(quoteId: string, itemCount: number, total: number) {
  posthog.capture("quote_created", {
    quote_id: quoteId,
    item_count: itemCount,
    total_amount: total,
  });
}

export function trackQuoteSent(quoteId: string) {
  posthog.capture("quote_sent", { quote_id: quoteId });
}

export function trackSubscriptionStarted(tier: "pro" | "lifetime") {
  posthog.capture("subscription_started", { tier });
}

export function trackUpgradeClicked(source: string) {
  posthog.capture("upgrade_clicked", { source });
}

// ─── User Identification ───
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  posthog.identify(userId, properties);
}

export function resetUser() {
  posthog.reset();
}
