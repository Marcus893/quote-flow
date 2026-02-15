import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-1 text-gray-600 font-medium hover:text-gray-900 transition-colors w-fit"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 prose prose-sm prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900">Terms of Service</h2>
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">1. Acceptance of Terms</h3>
          <p className="text-gray-600 leading-relaxed">
            By using QuoteFlow, you agree to these terms of service. If you do not agree, 
            please do not use the service.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">2. Description of Service</h3>
          <p className="text-gray-600 leading-relaxed">
            QuoteFlow is a web application that allows contractors and tradespeople to create, 
            send, and manage professional quotes. The service includes quote creation, customer 
            management, payment tracking, and automated follow-up emails.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">3. User Accounts</h3>
          <p className="text-gray-600 leading-relaxed">
            You are responsible for maintaining the security of your account. You must provide 
            accurate information when creating your account and keep your information up to date.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">4. Subscriptions & Payments</h3>
          <p className="text-gray-600 leading-relaxed">
            QuoteFlow offers Free, Pro, and Lifetime subscription tiers. Pro subscriptions are 
            billed monthly and can be cancelled anytime. Lifetime purchases are one-time payments. 
            Refunds are handled on a case-by-case basis.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">5. Acceptable Use</h3>
          <p className="text-gray-600 leading-relaxed">
            You agree not to misuse the service, including sending spam, uploading malicious content, 
            or using the service for any illegal purpose.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">6. Limitation of Liability</h3>
          <p className="text-gray-600 leading-relaxed">
            QuoteFlow is provided &quot;as is&quot; without warranties. We are not liable for any 
            damages arising from your use of the service, including lost revenue or data.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">7. Changes to Terms</h3>
          <p className="text-gray-600 leading-relaxed">
            We may update these terms from time to time. Continued use of the service after changes 
            constitutes acceptance of the new terms.
          </p>
        </div>
      </main>
    </div>
  );
}
