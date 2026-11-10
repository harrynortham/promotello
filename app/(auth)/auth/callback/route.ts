import { NextResponse } from "next/server";

import { afterSignIn, destinationFor } from "@/lib/after-sign-in";
import { isBusinessDestination } from "@/lib/redirects";
import { createClient } from "@/utils/supabase/server";

// Where Google sends people back to, and where an email link lands if one
// is ever sent again. Signing in with a code doesn't come through here:
// the browser verifies it and then calls /auth/signed-in.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");

  const next = destinationFor(requestedNext);
  const businessFlow = isBusinessDestination(next);

  if (code) {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const landing = await afterSignIn(supabase, data.user, requestedNext);

        return NextResponse.redirect(new URL(landing, requestUrl.origin));
      }
    } catch {
      // Continue to the sign-in fallback below.
    }
  }

  // A link opened again, e.g. a confirmation clicked twice, fails, but the
  // first click may already have signed this browser in.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const landing = await afterSignIn(supabase, user, requestedNext);

      return NextResponse.redirect(new URL(landing, requestUrl.origin));
    }
  } catch {
    // Not signed in: carry on to the sign-in page.
  }

  const loginUrl = new URL("/login", requestUrl.origin);

  loginUrl.searchParams.set("error", isOAuthFailure(requestUrl.searchParams) ? "oauth" : "link");

  if (next !== "/dashboard" && !businessFlow) {
    loginUrl.searchParams.set("next", next);
  }

  if (businessFlow) {
    loginUrl.searchParams.set("next", "/business/dashboard");
  }

  return NextResponse.redirect(loginUrl);
}

// Google or Apple sign-in that was cancelled or refused comes back with an
// error and no code. Email links that have expired or were already used
// come back with an error too, but Supabase marks those as otp_expired.
function isOAuthFailure(params: URLSearchParams) {
  if (!params.has("error") && !params.has("error_description")) {
    return false;
  }

  return (
    params.get("error_code") !== "otp_expired" &&
    !/email link/i.test(params.get("error_description") ?? "")
  );
}
