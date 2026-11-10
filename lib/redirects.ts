// Pages a user may be sent back to after signing in or confirming their
// email. Only same-site paths under these prefixes are accepted, so a
// crafted ?next= link can't redirect someone to another website.
const allowedPrefixes = [
    "/offers/",
    "/businesses/",
    "/stamp/",
    "/redeem/",
    "/dashboard",
    "/account",
    "/business/dashboard",
    "/business/preview/",
    "/business/setup/",
    "/onboarding",
    "/admin",
    "/invite/",
];

export function safeNextPath(value: string | null | undefined) {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
        return null;
    }

    const path = value.split(/[?#]/)[0];

    const allowed = allowedPrefixes.some((prefix) =>
        prefix.endsWith("/")
            ? path.startsWith(prefix) && path.length > prefix.length
            : path === prefix || path.startsWith(`${prefix}/`),
    );

    return allowed ? value : null;
}

// Whether someone arriving here is signing up to run a business rather
// than to use one. They get the business welcome once they have a
// business, and a reminder if they never make one — never the customer
// welcome, which tells them to go and find offers near them.
//
// "/businesses/..." is the public directory, which is a customer reading
// about a business, so it is deliberately not a business destination.
export function isBusinessDestination(next: string) {
    return next === "/onboarding" || next === "/business" || next.startsWith("/business/");
}
