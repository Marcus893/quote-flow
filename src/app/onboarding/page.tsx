"use client";

import { createClient } from "@/lib/supabase/client";
import { Building2, ArrowRight, DollarSign, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { trackOnboardingComplete, identifyUser } from "@/lib/analytics";

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment links
  const [venmo, setVenmo] = useState("");
  const [zelle, setZelle] = useState("");
  const [paypal, setPaypal] = useState("");
  const [cashapp, setCashapp] = useState("");
  const [customPaymentName, setCustomPaymentName] = useState("");
  const [customPaymentLink, setCustomPaymentLink] = useState("");

  // Stripe Connect
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeMessage, setStripeMessage] = useState<string | null>(null);

  // Pre-fill from auth + existing profile
  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profile) {
          if (profile.business_name) setBusinessName(profile.business_name);
          if (profile.phone) setPhone(profile.phone);
          if (profile.email) setEmail(profile.email);
          // Check actual Stripe onboarding status via API
          if (profile.stripe_account_id) {
            try {
              const res = await fetch("/api/stripe/status");
              const data = await res.json();
              setStripeConnected(data.connected === true);
            } catch {
              setStripeConnected(false);
            }
          }
          const links = (profile.payment_links as Record<string, string>) || {};
          if (links.venmo) setVenmo(links.venmo);
          if (links.zelle) setZelle(links.zelle);
          if (links.paypal) setPaypal(links.paypal);
          if (links.cashapp) setCashapp(links.cashapp);
          if (links.custom_name) setCustomPaymentName(links.custom_name);
          if (links.custom_link) setCustomPaymentLink(links.custom_link);
        }
      }
    };
    loadProfile();

    // Handle Stripe redirect params
    if (searchParams.get("stripe_connected") === "true") {
      // Verify actual status from Stripe API
      fetch("/api/stripe/status")
        .then((res) => res.json())
        .then((data) => {
          if (data.connected) {
            setStripeConnected(true);
            setStripeMessage("Stripe connected successfully! You can now accept credit card payments.");
            setTimeout(() => setStripeMessage(null), 5000);
          } else {
            setStripeConnected(false);
            setStripeMessage("Stripe onboarding is not complete yet. Please try connecting again to finish setup.");
          }
        })
        .catch(() => {
          setStripeConnected(false);
        });
    }
    if (searchParams.get("stripe_refresh") === "true") {
      setStripeMessage("Stripe onboarding link expired. Please try again.");
    }
  }, [searchParams]);


  const handleSubmit = async () => {
    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }

    if (!email.trim()) {
      setError("Business email is required");
      return;
    }

    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }



    // Build payment links object
    const paymentLinks: Record<string, string> = {};
    if (venmo.trim()) paymentLinks.venmo = venmo.trim();
    if (zelle.trim()) paymentLinks.zelle = zelle.trim();
    if (paypal.trim()) paymentLinks.paypal = paypal.trim();
    if (cashapp.trim()) paymentLinks.cashapp = cashapp.trim();
    if (customPaymentName.trim() && customPaymentLink.trim()) {
      paymentLinks.custom_name = customPaymentName.trim();
      paymentLinks.custom_link = customPaymentLink.trim();
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        business_name: businessName.trim(),
        phone: phone.trim() || null,
        email: email.trim(),
        payment_links: paymentLinks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Failed to save profile: " + updateError.message);
      setLoading(false);
      return;
    }

    identifyUser(user.id, { email: email.trim(), business_name: businessName.trim() });
    trackOnboardingComplete(businessName.trim());
    router.push("/dashboard");
  };

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    setStripeMessage(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect Stripe");
      // Redirect to Stripe hosted onboarding
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect Stripe";
      setStripeMessage(message);
      setStripeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Set Up Your Business
          </h1>
          <p className="text-gray-500 mt-2">
            This info appears on your professional quotes
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}



          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Mike's Plumbing Co."
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mike@plumbing.com"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Payment Links Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
          </div>
          <p className="text-sm text-gray-500">
            Add your payment links so customers can pay you directly. (Optional — you can add these later)
          </p>

          {/* Venmo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Venmo
            </label>
            <input
              type="text"
              value={venmo}
              onChange={(e) => setVenmo(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Zelle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zelle
            </label>
            <input
              type="text"
              value={zelle}
              onChange={(e) => setZelle(e.target.value)}
              placeholder="email@example.com or phone number"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* PayPal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PayPal
            </label>
            <input
              type="text"
              value={paypal}
              onChange={(e) => setPaypal(e.target.value)}
              placeholder="https://paypal.me/username"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* CashApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cash App
            </label>
            <input
              type="text"
              value={cashapp}
              onChange={(e) => setCashapp(e.target.value)}
              placeholder="$cashtag"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Custom Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Payment Method
            </label>
            <input
              type="text"
              value={customPaymentName}
              onChange={(e) => setCustomPaymentName(e.target.value)}
              placeholder="Method name (e.g. Wire Transfer, Stripe)"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
            />
            <input
              type="text"
              value={customPaymentLink}
              onChange={(e) => setCustomPaymentLink(e.target.value)}
              placeholder="Link or instructions"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stripe Connect Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Credit Card Payments</h2>
          </div>
          <p className="text-sm text-gray-500">
            Connect Stripe to accept credit and debit card payments from your customers. (Optional)
          </p>

          {stripeMessage && (
            <div className={`p-3 rounded-xl text-sm text-center font-medium ${
              stripeMessage.includes("success") 
                ? "bg-green-50 border border-green-200 text-green-700" 
                : "bg-yellow-50 border border-yellow-200 text-yellow-700"
            }`}>
              {stripeMessage}
            </div>
          )}

          {stripeConnected ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Stripe Connected</p>
                <p className="text-xs text-green-600">You can accept credit card payments from customers.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnectStripe}
              disabled={stripeLoading}
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white rounded-xl px-6 py-4 text-base font-semibold hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stripeLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Connect Stripe
                </>
              )}
            </button>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            disabled={loading || !businessName.trim() || !email.trim() || !phone.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-6 py-4 text-base font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Continue to Dashboard"}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
