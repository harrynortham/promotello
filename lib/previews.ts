// A business built for a preview is owned by the admin who built it until
// someone claims it, which is only true of the row: it isn't a business they
// run, and it belongs in /admin/previews rather than in their dashboard.
//
// The embedded rows are empty for anyone who isn't a platform admin, since
// only they can read business_previews — so this is a no-op for everyone else.
export function unclaimedPreview(business: {
    business_previews?: { claimed_at: string | null }[] | null;
}) {
    return (business.business_previews ?? []).some((preview) => preview.claimed_at === null);
}

// A preview link is pasted into an email or a DM, where it is read before
// it is clicked. "promotello.com/business/preview/fcdbe48a-49fc-450a…"
// looks like a tracking link; with their name in front of it, it looks
// like theirs. The token is still the whole of the key — the name in front
// of it is decoration, and is never checked.
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/g, "");
}

export function previewLink(token: string, businessName?: string | null) {
    const name = businessName ? slugify(businessName) : "";

    return `/business/preview/${name ? `${name}-${token}` : token}`;
}

// The token is the last 36 characters, whatever is in front of it. A link
// sent before the name was added is a bare token, and still reads.
export function tokenFromPreviewSegment(segment: string) {
    const token = segment.slice(-36);

    return TOKEN.test(token) ? token : null;
}

// The preview someone was claiming when they were sent off to register.
// They pressed Claim before they had an account, so coming back with a
// confirmed email is the rest of that one action rather than a new one.
export function previewBeingClaimed(next: string) {
    const path = next.split(/[?#]/)[0];

    if (!path.startsWith("/business/preview/")) {
        return null;
    }

    return tokenFromPreviewSegment(path.slice("/business/preview/".length));
}
