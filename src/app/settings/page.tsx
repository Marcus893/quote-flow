"use client";

import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Building2,
  Upload,
  Camera,
  DollarSign,
  CreditCard,
  CheckCircle,
  Loader2,
  Save,
  FileText,
  Crown,
  Lock,
  Sparkles,
  Mail,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import DeleteAccountButton from "@/app/dashboard/delete-account-button";
import { TIER_DISPLAY, getTierLimits, isPaidTier, type SubscriptionTier } from "@/lib/subscription";

const DEFAULT_TERMS_TEMPLATE = `• Payment is due within 15 days of invoice date.
• A deposit is required before work begins (percentage specified in quote).
• All materials and labor are guaranteed for 1 year from completion.
• Changes to the scope of work may result in additional charges.
• Cancellation within 48 hours of scheduled work may incur a cancellation fee.
• The contractor is not responsible for pre-existing conditions not identified in the quote.
• This quote is valid for 30 days from the date of issue.`;

function SettingsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Terms document
  const [termsDocument, setTermsDocument] = useState("");

  // Subscription
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [portalLoading, setPortalLoading] = useState(false);

  // Follow-up email settings
  const [followUpIntervals, setFollowUpIntervals] = useState<{ days: number; enabled: boolean }[]>([
    { days: 2, enabled: true },
    { days: 7, enabled: true },
    { days: 15, enabled: true },
  ]);
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [followUpMessage, setFollowUpMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
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
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.business_name) setBusinessName(profile.business_name);
        if (profile.phone) setPhone(profile.phone);
        if (profile.email) setEmail(profile.email);
        if (profile.logo_url) {
          setExistingLogoUrl(profile.logo_url);
          setLogoPreview(profile.logo_url);
        }

        // Subscription tier
        if (profile.subscription_tier) {
          setTier(profile.subscription_tier as SubscriptionTier);
        }

        // Check Stripe status via API
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

        // Load terms document (non-blocking)
        try {
          if (profile.terms_document) {
            setTermsDocument(profile.terms_document);
          } else {
            // Set default template if no terms saved yet
            setTermsDocument(DEFAULT_TERMS_TEMPLATE);
          }
        } catch {
          // terms_document column may not exist yet — use default
          setTermsDocument(DEFAULT_TERMS_TEMPLATE);
        }

        // Load follow-up email settings
        try {
          if (profile.follow_up_intervals) {
            setFollowUpIntervals(profile.follow_up_intervals as { days: number; enabled: boolean }[]);
          }
          if (profile.follow_up_subject) {
            setFollowUpSubject(profile.follow_up_subject);
          }
          if (profile.follow_up_message) {
            setFollowUpMessage(profile.follow_up_message);
          }
        } catch {
          // columns may not exist yet
        }
      }
      setPageLoading(false);

      // Handle subscription success redirect — update DB + UI
      // (webhook may not have fired yet, especially in local dev)
      const subSuccess = searchParams.get("subscription_success");
      if (subSuccess && user) {
        setTier(subSuccess as SubscriptionTier);
        setSuccess(`Successfully upgraded to ${subSuccess === "lifetime" ? "Lifetime" : "Pro"}! 🎉`);
        setTimeout(() => setSuccess(null), 5000);

        // Also update the database so the tier persists
        const updateData: Record<string, unknown> = {
          subscription_tier: subSuccess,
          updated_at: new Date().toISOString(),
        };
        if (subSuccess === "lifetime") {
          updateData.stripe_subscription_id = null;
          updateData.subscription_expires_at = null;
        }
        await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", user.id);
      }
    };
    loadProfile();

    if (searchParams.get("stripe_connected") === "true") {
      setStripeConnected(true);
      setStripeMessage(
        "Stripe connected successfully! You can now accept credit card payments.",
      );
      setTimeout(() => setStripeMessage(null), 5000);
    }
    if (searchParams.get("stripe_refresh") === "true") {
      setStripeMessage("Stripe onboarding link expired. Please try again.");
    }
  }, [searchParams, router]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
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
    setSuccess(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    let logoUrl: string | null = existingLogoUrl;

    if (logoFile) {
      const fileExt = logoFile.name.split(".").pop();
      const filePath = `${user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) {
        setError("Failed to upload logo: " + uploadError.message);
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("logos").getPublicUrl(filePath);
      logoUrl = publicUrl;
    }

    const paymentLinks: Record<string, string> = {};
    if (venmo.trim()) paymentLinks.venmo = venmo.trim();
    if (zelle.trim()) paymentLinks.zelle = zelle.trim();
    if (paypal.trim()) paymentLinks.paypal = paypal.trim();
    if (cashapp.trim()) paymentLinks.cashapp = cashapp.trim();
    if (customPaymentName.trim() && customPaymentLink.trim()) {
      paymentLinks.custom_name = customPaymentName.trim();
      paymentLinks.custom_link = customPaymentLink.trim();
    }

    let updatePayload: Record<string, unknown> = {
      business_name: businessName.trim(),
      phone: phone.trim() || null,
      email: email.trim(),
      logo_url: logoUrl,
      payment_links: paymentLinks,
      terms_document: termsDocument.trim() || null,
      follow_up_intervals: followUpIntervals,
      follow_up_subject: followUpSubject.trim() || null,
      follow_up_message: followUpMessage.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    // If terms_document or follow-up columns don't exist yet, retry without them
    if (updateError) {
      const { terms_document: _td, follow_up_intervals: _fi, follow_up_subject: _fs, follow_up_message: _fm, ...withoutNew } = updatePayload;
      void _td; void _fi; void _fs; void _fm;
      const retry = await supabase
        .from("profiles")
        .update(withoutNew)
        .eq("id", user.id);
      updateError = retry.error;
    }

    if (updateError) {
      setError("Failed to save profile: " + updateError.message);
      setLoading(false);
      return;
    }

    setSuccess("Profile updated successfully!");
    setTimeout(() => setSuccess(null), 3000);
    setLoading(false);
  };

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    setStripeMessage(null);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "settings" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect Stripe");
      window.location.href = data.url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to connect Stripe";
      setStripeMessage(message);
      setStripeLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open billing portal");
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to open billing portal";
      setError(message);
      setPortalLoading(false);
    }
  };

  const tierDisplay = TIER_DISPLAY[tier];
  const limits = getTierLimits(tier);
  const isPaid = isPaidTier(tier);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 text-gray-600 font-medium active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-8 space-y-6">
        {/* Subscription Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${tierDisplay.color}`}>
                  {isPaid && <Crown className="w-3.5 h-3.5" />}
                  {tierDisplay.badge}
                </span>
                {tier === "lifetime" && (
                  <span className="text-xs text-gray-500">Lifetime access</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {isPaid
                  ? "You have access to all features."
                  : "Upgrade to unlock unlimited quotes, photos, follow-ups & more."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {!isPaid && (
              <Link
                href="/subscription"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade Plan
              </Link>
            )}
            {tier === "pro" && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Manage Billing
              </button>
            )}
            {isPaid && (
              <Link
                href="/subscription"
                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                View Plans
              </Link>
            )}
          </div>
        </div>

        {/* Business Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Business Info
            </h2>
          </div>

          {/* Logo Upload */}
          <div className="flex flex-col items-center">
            {isPaid ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden"
                >
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400">Logo</span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-sm text-blue-600 font-medium flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {existingLogoUrl ? "Change Logo" : "Upload Logo"}
                </button>
              </>
            ) : (
              <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <Lock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-sm text-gray-600 font-medium">Custom Logo</p>
                <p className="text-xs text-gray-400 mb-2">Upgrade to Pro to add your business logo</p>
                <Link href="/subscription" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Upgrade Now →
                </Link>
              </div>
            )}
          </div>

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Payment Methods
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Add your payment links so customers can pay you directly.
          </p>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Payment Method
            </label>
            <input
              type="text"
              value={customPaymentName}
              onChange={(e) => setCustomPaymentName(e.target.value)}
              placeholder="Method name (e.g. Wire Transfer)"
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

        {/* Terms & Conditions Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Terms & Conditions
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Add default terms and conditions that will be attached to all your
            quotes. Customers can review this document before signing.
          </p>
          <textarea
            value={termsDocument}
            onChange={(e) => setTermsDocument(e.target.value)}
            placeholder={
              "e.g.\n• Payment is due within 30 days of invoice.\n• A deposit of 25% is required before work begins.\n• All materials and labor are guaranteed for 1 year.\n• Changes to the scope of work may result in additional charges.\n• Cancellation within 48 hours of scheduled work may incur a fee."
            }
            rows={8}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y leading-relaxed"
          />
          <p className="text-xs text-gray-400">
            This will appear at the bottom of every quote you send.
          </p>
        </div>

        {/* Follow-Up Emails Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Follow-Up Emails
            </h2>
          </div>

          {isPaid ? (
            <>
              <p className="text-sm text-gray-500">
                Customize when automated follow-up emails are sent to customers who have
                viewed but haven&apos;t signed their quote.
              </p>

              {/* Intervals */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Send reminders after (days)
                </label>
                {followUpIntervals.map((interval, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...followUpIntervals];
                        updated[index] = { ...updated[index], enabled: !updated[index].enabled };
                        setFollowUpIntervals(updated);
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        interval.enabled ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          interval.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={interval.days}
                      onChange={(e) => {
                        const updated = [...followUpIntervals];
                        updated[index] = { ...updated[index], days: Math.max(1, parseInt(e.target.value) || 1) };
                        setFollowUpIntervals(updated);
                      }}
                      className="w-20 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    />
                    <span className="text-sm text-gray-500">days after viewed</span>
                    {followUpIntervals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFollowUpIntervals(followUpIntervals.filter((_, i) => i !== index));
                        }}
                        className="ml-auto p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {followUpIntervals.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      const lastDay = followUpIntervals[followUpIntervals.length - 1]?.days || 7;
                      setFollowUpIntervals([...followUpIntervals, { days: lastDay + 7, enabled: true }]);
                    }}
                    className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Reminder
                  </button>
                )}
              </div>

              {/* Custom Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Email Subject
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  value={followUpSubject}
                  onChange={(e) => setFollowUpSubject(e.target.value)}
                  placeholder='e.g. Reminder about your quote for "{quote_name}"'
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available variables: {"{customer_name}"}, {"{quote_name}"}, {"{business_name}"}
                </p>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Email Message
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  placeholder={`e.g. Hi {customer_name},\n\nJust following up on the quote for {quote_name}. Let me know if you have any questions — happy to chat!\n\nBest,\n{business_name}`}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y leading-relaxed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank to use the default follow-up message. Variables: {"{customer_name}"}, {"{quote_name}"}, {"{business_name}"}, {"{quote_url}"}
                </p>
              </div>
            </>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
              <Lock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600 font-medium">Custom Follow-Up Emails</p>
              <p className="text-xs text-gray-400 mb-2">
                Upgrade to Pro to customize follow-up timing and email content
              </p>
              <Link href="/subscription" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Upgrade Now →
              </Link>
            </div>
          )}
        </div>

        {/* Stripe Connect Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Credit Card Payments
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Connect Stripe to accept credit and debit card payments from your
            customers.
          </p>

          {stripeMessage && (
            <div
              className={`p-3 rounded-xl text-sm text-center font-medium ${
                stripeMessage.includes("success")
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-yellow-50 border border-yellow-200 text-yellow-700"
              }`}
            >
              {stripeMessage}
            </div>
          )}

          {stripeConnected ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Stripe Connected
                </p>
                <p className="text-xs text-green-600">
                  You can accept credit card payments from customers.
                </p>
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

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={
            loading || !businessName.trim() || !email.trim() || !phone.trim()
          }
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-6 py-4 text-base font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
            {success}
          </div>
        )}

        {/* Danger Zone */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <DeleteAccountButton />
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsForm />
    </Suspense>
  );
}
