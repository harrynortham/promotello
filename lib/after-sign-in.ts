import type { SupabaseClient, User } from "@supabase/supabase-js";
import { after } from "next/server";

import { accountWelcomeEmail } from "@/lib/account-emails";
import { claimOffer, offerBeingClaimed, sendVoucherFor } from "@/lib/claim-offer";
import { claimPreview } from "@/lib/claim-preview";
import { sendEmails } from "@/lib/email";
import { landingAfterSignIn } from "@/lib/landing";
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

    // Business sign-ups get the business welcome after onboarding, and are
    // marked so the daily job can remind them if they never get there.
    // Invited team members are joining a business, so neither.
    if (businessFlow) {
        after(() => markBusinessSignUp(user));
    } else if (!next.startsWith("/invite/")) {
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

    // They pressed "Log in to claim this deal", which is one thing asked
    // for, not two: it is claimed here, and they land on the voucher
    // rather than on the button again.
    const offer = offerBeingClaimed(next);

    if (offer) {
        const { redemptionId, error } = await claimOffer(supabase, offer, user);

        if (error) {
            // Expired, all gone, or already theirs: the offer page says
            // which, so there is nothing to do but take them to it.
            console.error("After sign-in: claiming the offer failed", error);
        }

        if (redemptionId) {
            await sendVoucherFor(supabase, user, redemptionId).catch((failure) =>
                console.error("After sign-in: the voucher email failed", failure),
            );
        }

        return `/offers/${offer}`;
    }

    return unasked ? await landingAfterSignIn(supabase, user) : next;
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
        console.error("After sign-in: marking business sign-up failed", error);
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
        console.error("After sign-in: welcome email failed", error);
    }
}
