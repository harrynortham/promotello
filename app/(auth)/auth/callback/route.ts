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

  loginUrl.searchParams.set(
    "error",
    "This verification link could not be completed. It may have expired or already been used. Try signing in, or request a new link.",
  );

  if (businessFlow) {
    loginUrl.searchParams.set("next", "/business/dashboard");
  }

  return NextResponse.redirect(loginUrl);
}
