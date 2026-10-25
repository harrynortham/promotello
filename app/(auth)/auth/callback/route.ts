import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/redirects";
import { createClient } from "@/utils/supabase/server";

const allowedDestinations = new Set([
  "/dashboard",
  "/business/dashboard",
  "/onboarding",
  "/reset-password",
  "/account/security",
]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");

  const next =
    requestedNext && allowedDestinations.has(requestedNext)
      ? requestedNext
      : (safeNextPath(requestedNext) ?? "/dashboard");

  const businessFlow = next === "/onboarding" || next === "/business/dashboard";

  if (code) {
    try {
      const supabase = await createClient();

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    } catch {
      // Continue to the sign-in fallback below.
    }
  }

  const loginUrl = new URL("/login", requestUrl.origin);

  // Google or Apple sign-in that was cancelled or refused comes back with
  // an error and no code; anything else is an email link that failed.
  loginUrl.searchParams.set(
    "error",
    requestUrl.searchParams.has("error_description") || requestUrl.searchParams.has("error")
      ? "oauth"
      : "link",
  );

  if (next !== "/dashboard" && !businessFlow) {
    loginUrl.searchParams.set("next", next);
  }

  if (businessFlow) {
    loginUrl.searchParams.set("next", "/business/dashboard");
  }

  return NextResponse.redirect(loginUrl);
}
