import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Wrench,
  CheckCircle,
  Clock,
  Zap,
  AlertCircle,
  DollarSign,
  FileText,
  Camera,
  Send,
  Bell,
  Shield,
  Star,
  Crown,
  Check,
  X,
  ArrowRight,
  Smartphone,
  Download,
  Share2,
} from "lucide-react";
import ScrollLink from "@/components/scroll-link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navigation ─── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">QuoteFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
                >
                  Log in
                </Link>
                <Link
                  href="/login"
                  className="bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="bg-white py-16 sm:py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Wrench className="w-3.5 h-3.5" />
            Built for People Who Work With Their Hands
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Create Professional Quotes in 60 Seconds.
            <br />
            <span className="text-blue-600">Get Paid Faster.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            Stop losing jobs to slow quotes and messy paperwork. QuoteFlow lets
            you build, send, and track professional quotes right from your phone
            — so you can spend more time closing deals.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl px-8 py-4 text-lg font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <ScrollLink
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl px-8 py-4 text-lg font-medium hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              See Pricing
            </ScrollLink>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              3-minute setup
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Free forever plan
            </span>
          </div>
        </div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <section className="bg-gray-50 border-y border-gray-100 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">
            Trusted by contractors across the country
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-extrabold text-gray-900">10,000+</p>
              <p className="text-sm text-gray-500 mt-1">
                professional quotes sent
              </p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">4.9 ★</p>
              <p className="text-sm text-gray-500 mt-1">
                average contractor rating
              </p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">2x Faster</p>
              <p className="text-sm text-gray-500 mt-1">payment collection</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Problem / Solution (PAS Framework) ─── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3 text-center">
            The Problem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
            You&apos;re Great at Your Trade.
            <br className="hidden sm:block" /> Paperwork? Not So Much.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: AlertCircle,
                title: "Lost Quotes",
                desc: "Scribbled on napkins or buried in texts. You forget to follow up, and the job goes to someone else.",
              },
              {
                icon: Clock,
                title: "Wasted Evenings",
                desc: "You finish a long day of work, then spend your evening typing up quotes on your laptop.",
              },
              {
                icon: DollarSign,
                title: "Chasing Payments",
                desc: "You did the work. Now you're playing debt collector, sending awkward texts asking to get paid.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-red-50 border border-red-100 rounded-2xl p-6"
              >
                <card.icon className="w-10 h-10 text-red-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-green-600 rotate-90" />
            </div>
          </div>

          <p className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-3 text-center">
            The Solution
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            QuoteFlow Handles the Business Side
            <br className="hidden sm:block" /> So You Don&apos;t Have To
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto text-center">
            From the moment a customer asks for a quote to the moment you get
            paid — QuoteFlow keeps everything organized, professional, and
            automatic.
          </p>
        </div>
      </section>

      {/* ─── Key Features / Benefits ─── */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3 text-center">
            Everything You Need
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
            One App. Every Tool to Run Your Business.
          </h2>
          <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-12">
            No more juggling 5 different apps. QuoteFlow gives you everything in
            your pocket.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "60-Second Quotes",
                desc: "Create beautiful, professional quotes on the job site. Add line items, photos, and notes — send before you leave.",
              },
              {
                icon: Camera,
                title: "Photo Documentation",
                desc: "Attach photos directly to line items. Show customers exactly what needs work and protect yourself with visual records.",
              },
              {
                icon: Send,
                title: "One-Tap Send",
                desc: "Send quote via email and text message with a single tap. Customers get a branded page they can view, sign, and pay.",
              },
              {
                icon: DollarSign,
                title: "Get Paid Faster",
                desc: "Accept payments via credit card, ACH, Venmo, Zelle, PayPal and more. Deposits or invoiced payments, all tracked.",
              },
              {
                icon: Bell,
                title: "Auto Follow-Ups",
                desc: "Forgot to chase a quote? We do it for you. Automatic email reminders at 2, 7, and 15 days after viewing.",
              },
              {
                icon: Shield,
                title: "Signatures & Terms",
                desc: "Legally binding e-signatures. Attach your terms & conditions. Everything documented and timestamped.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3 text-center">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            From Quote to Cash in 4 Simple Steps
          </h2>

          <div className="relative">
            {[
              {
                num: 1,
                title: "Create Your Quote",
                desc: "Add line items, attach photos, set your deposit percentage. Takes less than 60 seconds.",
              },
              {
                num: 2,
                title: "Customer Reviews & Signs",
                desc: "They get a professional, branded link. One tap to approve and e-sign.",
              },
              {
                num: 3,
                title: "Track Payments",
                desc: "See deposits, partial payments, and full payments in real time. Check uploaded receipts. Everything in one place.",
              },
              {
                num: 4,
                title: "Get Paid & Download Invoice",
                desc: "Job done, money in. Download a professional invoice for your records.",
              },
            ].map((step, i) => (
              <div key={step.num} className="flex items-start">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    {step.num}
                  </div>
                  {i < 3 && (
                    <div className="w-0.5 h-full min-h-12 bg-blue-200" />
                  )}
                </div>
                <div className="ml-6 pb-10">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3 text-center">
            What Contractors Say
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            Don&apos;t Take Our Word for It
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "I used to spend my Sunday afternoons typing up quotes. Now I send them from the job site in under a minute. Game changer.",
                name: "Mike R.",
                trade: "Plumber",
                initials: "MR",
              },
              {
                quote:
                  "The auto follow-up emails alone have won me 3 extra jobs this month. Customers just forget — now they get a reminder without me having to chase them.",
                name: "Sarah T.",
                trade: "Electrician",
                initials: "ST",
              },
              {
                quote:
                  "My customers love the professional quotes with photos. It sets me apart from every other contractor who sends a text message estimate.",
                name: "David K.",
                trade: "General Contractor",
                initials: "DK",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mt-3 mb-4 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500">{t.trade}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PWA Install Showcase ─── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3 text-center">
            Works Like a Native App
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
            Install It on Your Phone in Seconds
          </h2>
          <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-12">
            No app store needed. QuoteFlow installs directly to your home screen
            and works just like a native mobile app — offline-ready and always
            one tap away.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: Share2,
                step: "1",
                title: "Open & Tap Share",
                desc: "Visit QuoteFlow in your browser and tap the share button (iOS) or menu icon (Android / Chrome).",
              },
              {
                icon: Download,
                step: "2",
                title: "\"Add to Home Screen\"",
                desc: "Select \"Add to Home Screen\" from the menu. Confirm the name and tap Add.",
              },
              {
                icon: Smartphone,
                step: "3",
                title: "Launch Like an App",
                desc: "QuoteFlow now lives on your home screen — full-screen, fast, and no browser bar. Just like a real app.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="text-center flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <item.icon className="w-7 h-7 text-blue-600" />
                </div>
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-5 py-2.5 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Works on iPhone, Android, iPad & Desktop
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="bg-white py-20 px-6 scroll-mt-16">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3 text-center">
            Simple Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
            Start Free. Upgrade When You&apos;re Ready.
          </h2>
          <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-12">
            No surprises. No hidden fees. Cancel anytime.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Free */}
            <div className="rounded-2xl border-2 border-gray-100 p-6 flex flex-col">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-gray-500" />
                  <h3 className="font-bold text-gray-900 text-lg">Free</h3>
                </div>
                <p className="text-sm text-gray-500">Get started for free</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-gray-900">
                  $0
                </span>
                <span className="text-gray-500 ml-1">/forever</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  { text: "Up to 3 quotes", included: true },
                  { text: "3 photos maximum per item", included: true },
                  { text: "E-signatures & payments", included: true },
                  { text: "Credit card payments", included: true },
                  { text: "Custom logo", included: false },
                  { text: "Auto follow-up emails", included: false },
                  { text: "Invoice export", included: false },
                ].map((f) => (
                  <li key={f.text} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                    <span
                      className={f.included ? "text-gray-700" : "text-gray-400"}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 text-center text-sm font-semibold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-100 p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-lg">Pro</h3>
                </div>
                <p className="text-sm text-gray-500">Everything you need</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-gray-900">
                  $15
                </span>
                <span className="text-gray-500 ml-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Unlimited quotes",
                  "12 photos per line item",
                  "E-signatures & payments",
                  "Credit card payments",
                  "Custom logo",
                  "Auto follow-up emails",
                  "Invoice export",
                  "24/7 priority support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 text-center text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                Start Free, Upgrade Later
              </Link>
            </div>

            {/* Lifetime */}
            <div className="rounded-2xl border-2 border-amber-500 shadow-lg shadow-amber-100 p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Best Value
                </span>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-gray-900 text-lg">Lifetime</h3>
                </div>
                <p className="text-sm text-gray-500">One-time, forever</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-gray-900">
                  $129
                </span>
                <span className="text-gray-500 ml-1">one-time</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Unlimited quotes",
                  "12 photos per line item",
                  "E-signatures & payments",
                  "Credit card payments",
                  "Custom logo",
                  "Auto follow-up emails",
                  "Invoice export",
                  "24/7 priority support",
                  "Life time access to all current and future features",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 text-center text-sm font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all"
              >
                Get Lifetime Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Close More Deals and Get Paid Faster?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Join thousands of contractors who stopped chasing paperwork and
            started growing their business.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-blue-600 rounded-2xl px-8 py-4 text-lg font-bold hover:bg-blue-50 active:scale-[0.98] transition-all shadow-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm text-blue-200">
            Free forever plan available · No credit card required · Set up in 3
            minutes
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-900 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-lg">QuoteFlow</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Professional quotes for contractors.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Product
                </h4>
                <ul className="space-y-2">
                  <li>
                    <ScrollLink
                      href="#pricing"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Pricing
                    </ScrollLink>
                  </li>
                  <li>
                    <Link
                      href="/login"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Log in
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Legal
                </h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/privacy"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Support
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="mailto:marcus@usequoteflow.com"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Contact Us
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} QuoteFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
