import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// If the Stripe onboarding link expires, redirect user back
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const cookieStore = await cookies();
  const returnTo = cookieStore.get("stripe_return_to")?.value || "onboarding";
  const dest = returnTo === "settings" ? "settings" : "onboarding";
  return NextResponse.redirect(`${baseUrl}/${dest}?stripe_refresh=true`);
}
