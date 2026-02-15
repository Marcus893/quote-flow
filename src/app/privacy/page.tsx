import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
          <h2 className="text-xl font-bold text-gray-900">Privacy Policy</h2>
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">1. Information We Collect</h3>
          <p className="text-gray-600 leading-relaxed">
            We collect information you provide when creating an account, including your name, email address, 
            business name, phone number, and logo. We also collect data related to the quotes you create, 
            including customer names, emails, and quote details.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">2. How We Use Your Information</h3>
          <p className="text-gray-600 leading-relaxed">
            Your information is used to provide and improve our services, send quotes and follow-up emails 
            on your behalf, process payments, and communicate with you about your account.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">3. Data Storage</h3>
          <p className="text-gray-600 leading-relaxed">
            Your data is stored securely using Supabase infrastructure with encryption at rest and in transit. 
            We do not sell your personal information to third parties.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">4. Third-Party Services</h3>
          <p className="text-gray-600 leading-relaxed">
            We use Stripe for payment processing, Resend for email delivery, and Google for authentication. 
            Each of these services has their own privacy policies.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">5. Your Rights</h3>
          <p className="text-gray-600 leading-relaxed">
            You can access, update, or delete your account data at any time from the Settings page. 
            To request complete data deletion, use the &quot;Delete Account&quot; feature in Settings.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">6. Contact</h3>
          <p className="text-gray-600 leading-relaxed">
            If you have questions about this privacy policy, please contact us through the app.
          </p>
        </div>
      </main>
    </div>
  );
}
