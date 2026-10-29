import type { User } from "@supabase/supabase-js";
import { after, NextResponse } from "next/server";

import { accountWelcomeEmail } from "@/lib/account-emails";
import { sendEmails } from "@/lib/email";
import { safeNextPath } from "@/lib/redirects";
import { createAdminClient } from "@/utils/supabase/admin";
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

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const user = data.user;

        // Business sign-ups get the business welcome after onboarding, and
        // are marked so the daily job can remind them if they never get
        // there. Invited team members are joining a business, so neither.
        if (businessFlow) {
          after(() => markBusinessSignUp(user));
        } else if (!next.startsWith("/invite/")) {
          after(() => welcomeNewCustomer(user));
        }

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

// Accounts older than this when they first come through here signed up
// before these emails existed, so they're left alone.
const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;

function isNewAccount(user: User) {
  return Date.now() - new Date(user.created_at).getTime() <= NEW_ACCOUNT_WINDOW_MS;
}

// Read by claim_business_signup_reminders(): business accounts that
// haven't created a business a day later get one reminder.
async function markBusinessSignUp(user: User) {
  if (user.app_metadata?.business_signup_at || !isNewAccount(user)) {
    return;
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
    app_metadata: { business_signup_at: new Date().toISOString() },
  });

  if (error) {
    console.error("Auth callback: marking business sign-up failed", error);
  }
}

async function welcomeNewCustomer(user: User) {
  if (!user.email || user.app_metadata?.welcomed_at || !isNewAccount(user)) {
    return;
  }

  try {
    // Recorded before sending, so later sign-ins don't send it again.
    // app_metadata merges, and users can't edit it themselves.
    const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
      app_metadata: { welcomed_at: new Date().toISOString() },
    });

    if (error) {
      throw error;
    }

    const name =
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.given_name;
    const firstName = typeof name === "string" ? name.trim().split(/\s+/)[0] || null : null;

    await sendEmails([accountWelcomeEmail({ to: user.email, firstName })]);
  } catch (error) {
    console.error("Auth callback: welcome email failed", error);
  }
}
