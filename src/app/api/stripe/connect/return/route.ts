import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// After completing Stripe onboarding, redirect back to the correct page
export async function GET() {
  const { getBaseUrl } = await import("@/lib/url");
  const baseUrl = getBaseUrl();
  const cookieStore = await cookies();
  const returnTo = cookieStore.get("stripe_return_to")?.value || "onboarding";
  const dest = returnTo === "settings" ? "settings" : "onboarding";
  return NextResponse.redirect(`${baseUrl}/${dest}?stripe_connected=true`);
}
