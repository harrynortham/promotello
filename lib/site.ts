export const siteName = "Promotello";

// Canonical origin for metadata, the sitemap and structured data.
export const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.promotello.com"
).replace(/\/$/, "");

export const siteDescription =
    "Discover discounts and offers from independent shops, cafés and local businesses near you.";

export function absoluteUrl(path: string) {
    return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

// Plain-text summary for meta descriptions, cut on a word boundary.
export function truncate(text: string, maxLength = 155) {
    const clean = text.replace(/\s+/g, " ").trim();

    if (clean.length <= maxLength) {
        return clean;
    }

    const cut = clean.slice(0, maxLength - 1);
    return `${cut.slice(0, cut.lastIndexOf(" ")) || cut}…`;
}

// Serialise JSON-LD safely for a <script> tag.
export function jsonLd(data: unknown) {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Where Promotello is, elsewhere. Used by the footers and named in the
// Organization structured data, which is how a search engine ties the
// site and the accounts together as one thing.
export const socialProfiles = [
    { label: "X", network: "x", url: "https://x.com/promotello" },
    { label: "Facebook", network: "facebook", url: "https://www.facebook.com/promotello/" },
    { label: "YouTube", network: "youtube", url: "https://www.youtube.com/@promotello" },
    { label: "LinkedIn", network: "linkedin", url: "https://www.linkedin.com/company/promotello/" },
    { label: "Instagram", network: "instagram", url: "https://www.instagram.com/promotello/" },
    { label: "TikTok", network: "tiktok", url: "https://www.tiktok.com/@promotello" },
];
