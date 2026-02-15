# Mission Control: QuoteFlow

## 1. The Core Vibe

- **User:** The "Solo Pro" (Plumbers, Electricians, Landscapers).
- **Problem:** Paper quotes are slow; big apps are too complex; raw texts look cheap.
- **Solution:** A 60-second "Photo-to-Professional-Quote" PWA.
- **UX Strategy:** "Fat-finger friendly." Large buttons, high contrast (for sunlight visibility), and one-handed navigation.

## 2. The Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Lucide Icons
- **Database/Auth:** Supabase
- **Email:** Resend (for professional quote delivery)
- **Payments:** Payment Links set by the contractor (for deposit or other payments collection)
- **Deployment:** Netlify

## 3. The Database Schema (Supabase)

- **profiles:** `id, email, phone, business_name, logo_url`
- **customers:** `id, contractor_id, name, email, phone`
- **quotes:** `id, contractor_id, customer_id, items (JSONB), total_price, status (draft, sent, viewed, signed, paid_deposit, paid_full), photos (array), signature_data`

## 4. The "SMS Bypass" Logic (Crucial)

To avoid 10DLC compliance hurdles:

1. App sends professional email via **Resend**.
2. App provides a **"Text Link"** button on the success screen.
3. This button uses the `sms:` protocol:
   `sms:{phone_number}?&body=Hi {name}, here is your professional quote for {job}: {quote_url}`
4. This opens the contractor's **native** messaging app. No server-side SMS needed.

## 5. MVP Feature Priority (Sequential)

1. **Onboarding:** Simple Google Auth + Business Name input.
2. **The Creator:** A single-page form to add Customer Email, snap a Photo, and add Line Items.
3. **The Web-Quote:** A clean, public-facing URL where homeowners see the "Invoice Style" layout and a "Sign to Approve" box.
4. **The Notification:** Real-time alert to the contractor when the homeowner opens the link.
