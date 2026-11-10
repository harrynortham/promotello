import type { SupabaseClient, User } from "@supabase/supabase-js";
import { after } from "next/server";

import { accountWelcomeEmail } from "@/lib/account-emails";
import { claimPreview } from "@/lib/claim-preview";
import { sendEmails } from "@/lib/email";
import { customerWelcomeDue, isNewAccount } from "@/lib/customer-welcome";
import { businessMemberships, landingFor } from "@/lib/landing";
import { previewBeingClaimed } from "@/lib/previews";
import { isBusinessDestination, safeNextPath } from "@/lib/redirects";
import { createAdminClient } from "@/utils/supabase/admin";

// Everything that happens once somebody is signed in, whichever door they
// came through: a code emailed to them, or Google. It is all here rather
// than in the callback route because a code is verified in the browser,
// and the work still has to happen on the server afterwards.

const allowedDestinations = new Set([
    "/dashboard",
    "/business/dashboard",
    "/onboarding",
    "/business/setup/new",
    "/account/security",
]);

export function destinationFor(requestedNext: string | null) {
    return requestedNext && allowedDestinations.has(requestedNext)
        ? requestedNext
        : (safeNextPath(requestedNext) ?? "/dashboard");
}

// Where to send them, after anything that has to happen first. The caller
// redirects: this decides.
export async function afterSignIn(
    supabase: SupabaseClient,
    user: User,
    requestedNext: string | null,
) {
    const next = destinationFor(requestedNext);

    // Nothing asked for a page: the customer dashboard is only the
    // default, and who is signing in decides.
    const unasked = !requestedNext;

    // Claiming a preview is a business signing up too, and it used to fall
    // through to the customer welcome — which tells a shop owner to go and
    // find offers near them.
    const businessFlow = isBusinessDestination(next);

    // One read, two answers: the businesses they already run say both
    // where an unasked sign-in lands and which welcome is theirs.
    const memberships = await businessMemberships(supabase, user.id);

    // Business sign-ups are marked so the daily job can remind them if
    // they never get a business made.
    if (businessFlow) {
        after(() => markBusinessSignUp(user));
    } else if (
        customerWelcomeDue({
            next,
            createdAt: user.created_at,
            welcomedAt: user.app_metadata?.welcomed_at,
            businessSignUpAt: user.app_metadata?.business_signup_at,
            runsABusiness: memberships.length > 0,
        })
    ) {
        after(() => welcomeNewCustomer(user));
    }

    // They pressed Claim, were sent to register, and have just confirmed
    // their email. Making them press it again asks twice for the same
    // thing, so it is finished here and they land on the business rather
    // than back on the sales page for it.
    const claiming = previewBeingClaimed(next);

    if (claiming) {
        // Already claimed by them returns the same business, so arriving
        // twice is harmless. Claimed by somebody else fails, and they go on
        // to the preview page, which now says it has an owner.
        const { businessId, error } = await claimPreview(supabase, claiming, user.email);

        if (businessId) {
            return `/business/setup/${businessId}?welcome=1`;
        }

        console.error("After sign-in: claiming the preview failed", error);
    }

    return unasked ? landingFor(user, memberships) : next;
}

// Read by claim_business_signup_reminders(): business accounts that
// haven't created a business a day later get one reminder.
async function markBusinessSignUp(user: User) {
    if (user.app_metadata?.business_signup_at || !isNewAccount(user.created_at)) {
        return;
    }

    const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
        app_metadata: { business_signup_at: new Date().toISOString() },
    });

    if (error) {
        console.error("After sign-in: marking business sign-up failed", error);
    }
}

async function welcomeNewCustomer(user: User) {
    if (!user.email) {
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
        console.error("After sign-in: welcome email failed", error);
    }
}
