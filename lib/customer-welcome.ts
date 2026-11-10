import { isBusinessDestination } from "@/lib/redirects";

// Accounts older than this when they first come through sign-in signed up
// before these emails existed, so they're left alone.
export const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isNewAccount(createdAt: string, now = Date.now()) {
    return now - new Date(createdAt).getTime() <= NEW_ACCOUNT_WINDOW_MS;
}

// Whether a sign-in should send the customer welcome — the one that says
// their vouchers live in their dashboard and points them at offers near
// them. Decided during the request, because the sending happens after it.
export function customerWelcomeDue({
    next,
    createdAt,
    welcomedAt,
    businessSignUpAt,
    runsABusiness,
    now = Date.now(),
}: {
    next: string;
    createdAt: string;
    welcomedAt: string | null | undefined;
    businessSignUpAt: string | null | undefined;
    runsABusiness: boolean;
    now?: number;
}) {
    // Had it already, or signed up before it existed.
    if (welcomedAt || !isNewAccount(createdAt, now)) {
        return false;
    }

    // Here to run a business, not to use one: they get the business
    // welcome instead. Invited team members are joining a business, so
    // neither.
    if (isBusinessDestination(next) || next.startsWith("/invite/")) {
        return false;
    }

    // The one this missed: somebody who already runs a business signing in
    // on the customer form. The form they used doesn't make them a
    // customer, and they have had their welcome.
    return !businessSignUpAt && !runsABusiness;
}
