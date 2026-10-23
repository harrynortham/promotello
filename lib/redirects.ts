// Pages a user may be sent back to after signing in or confirming their
// email. Only same-site paths under these prefixes are accepted, so a
// crafted ?next= link can't redirect someone to another website.
const allowedPrefixes = [
    "/offers/",
    "/businesses/",
    "/dashboard",
    "/account",
    "/business/dashboard",
    "/onboarding",
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
