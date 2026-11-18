// Working out two things about a lead without touching the network: which
// address on a page is the one to write to, and whether a Companies House
// result is really the business we are looking at.
//
// Both are kept pure so they can be tested against saved pages and saved
// search results (tests/unit/lead-enrichment.test.ts). The fetching lives
// in lib/lead-jobs.ts, which has nothing to decide.

// Addresses that belong to the page rather than the business. Writing to
// any of these is at best useless and at worst a complaint.
const NOT_A_CONTACT = [
    "example.com",
    "sentry.io",
    "wixpress.com",
    "squarespace.com",
    "godaddy.com",
    "wordpress.com",
    "shopify.com",
    "cloudflare.com",
    "googlemail.com/noreply",
    "noreply",
    "no-reply",
    "donotreply",
];

// A local part that is plainly machinery.
const NOT_A_PERSON = /^(postmaster|abuse|webmaster|hostmaster|mailer-daemon|bounce|root)$/i;

// Ranked: an address a business publishes for enquiries beats one for
// bookings, which beats whatever else is on the page. A generic info@ is
// better than a personal address for a first approach — it is the one
// somebody is paid to read, and nobody feels singled out.
const PREFERRED = ["hello", "enquiries", "enquiry", "info", "contact", "bookings", "book", "shop", "orders"];

export type FoundEmail = { email: string; rank: number };

export function emailsFromHtml(html: string): string[] {
    const found = new Set<string>();

    // mailto: first — a link is somebody publishing an address on purpose.
    for (const match of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
        const address = cleanEmail(match[1]);
        if (address) found.add(address);
    }

    // Then anything that looks like an address in the text.
    for (const match of html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
        const address = cleanEmail(match[0]);
        if (address) found.add(address);
    }

    return [...found];
}

function cleanEmail(raw: string) {
    const address = decodeURIComponent(raw.trim())
        .replace(/^mailto:/i, "")
        .replace(/[.,;:)\]]+$/, "")
        .toLowerCase();

    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(address)) {
        return null;
    }

    const [local, domain] = address.split("@");

    if (NOT_A_PERSON.test(local)) return null;
    if (NOT_A_CONTACT.some((bad) => address.includes(bad))) return null;
    // An image file that happens to contain an @.
    if (/\.(png|jpe?g|gif|webp|svg|css|js)$/i.test(domain)) return null;

    return address;
}

// The one to write to, out of everything on the page. A domain that
// matches the website we fetched is worth more than a gmail on the same
// page, because it is theirs rather than whoever built the site.
export function bestEmail(candidates: string[], websiteHost?: string | null): string | null {
    const host = (websiteHost ?? "").toLowerCase().replace(/^www\./, "");

    const scored = candidates.map((email) => {
        const [local, domain] = email.split("@");
        let rank = 0;

        if (host && domain.replace(/^www\./, "") === host) rank += 10;

        const preferred = PREFERRED.indexOf(local);
        if (preferred >= 0) rank += 5 - Math.min(preferred, 4);

        return { email, rank };
    });

    scored.sort((a, b) => b.rank - a.rank || a.email.localeCompare(b.email));

    return scored[0]?.email ?? null;
}

// Which pages are worth fetching after the home page. Kept short: this is
// somebody else's server, and two extra requests is the whole budget.
export function contactPaths(html: string, base: string): string[] {
    const paths = new Set<string>();

    for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
        const href = match[1];

        if (!/contact|about|get-in-touch|enquir/i.test(href)) continue;

        try {
            const url = new URL(href, base);
            if (url.origin !== new URL(base).origin) continue;
            paths.add(url.toString());
        } catch {
            // A href we cannot parse is not worth a request.
        }
    }

    return [...paths].slice(0, 2);
}

// --- The legal gate ------------------------------------------------

export type CompanyCandidate = {
    company_number: string;
    title: string;
    company_status?: string | null;
    address_snippet?: string | null;
};

export type CompanyMatch =
    | { confident: true; company: CompanyCandidate }
    | { confident: false; reason: "none" | "ambiguous" | "dissolved" };

// Normalised for comparison: a shop called "The Little Loaf" is the same
// business as "LITTLE LOAF LTD" on the register.
function compare(value: string) {
    return value
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/\b(the|ltd|limited|llp|plc|co|company|uk)\b/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

// A match is only worth acting on when it is obvious, because the thing
// it unlocks is permission to email somebody. Anything doubtful stays
// unemailable and gets a letter instead, which needs no consent.
export function matchCompany(
    leadName: string,
    postcode: string | null | undefined,
    candidates: CompanyCandidate[],
): CompanyMatch {
    const wanted = compare(leadName);

    if (!wanted || candidates.length === 0) {
        return { confident: false, reason: "none" };
    }

    const live = candidates.filter(
        (candidate) => (candidate.company_status ?? "active").toLowerCase() === "active",
    );

    if (live.length === 0) {
        return { confident: false, reason: "dissolved" };
    }

    const byName = live.filter((candidate) => compare(candidate.title) === wanted);

    if (byName.length === 0) {
        return { confident: false, reason: "none" };
    }

    if (byName.length === 1) {
        return { confident: true, company: byName[0] };
    }

    // Several companies share the name: the postcode decides, and if it
    // cannot, nobody gets emailed on a guess.
    const tidyPostcode = (postcode ?? "").toUpperCase().replace(/\s+/g, "");

    if (tidyPostcode) {
        const here = byName.filter((candidate) =>
            (candidate.address_snippet ?? "").toUpperCase().replace(/\s+/g, "").includes(tidyPostcode),
        );

        if (here.length === 1) {
            return { confident: true, company: here[0] };
        }
    }

    return { confident: false, reason: "ambiguous" };
}

// --- The address they publish --------------------------------------
//
// Google's terms let a place_id be kept and restrict storing the rest,
// so the address on a lead should come from somewhere we may keep it.
// The business's own contact page is the obvious one: we are already
// fetching it for the email, it is the address they chose to publish,
// and unlike a registered office it is where the shop actually is —
// which is what a letter needs.

// A UK postcode, which is the anchor for everything below: find one and
// the address is the line it sits on and the few before it.
const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

export function postcodeFrom(text: string) {
    const match = POSTCODE.exec(text);

    return match ? `${match[1].toUpperCase()} ${match[2].toUpperCase()}` : null;
}

// schema.org markup, where a site has it. Far and away the most reliable
// source: the business has labelled the parts itself, so nothing has to
// be guessed from punctuation.
function fromJsonLd(html: string): string | null {
    for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
        let parsed: unknown;

        try {
            parsed = JSON.parse(block[1].trim());
        } catch {
            continue;
        }

        const found = findPostalAddress(parsed);
        if (found) return found;
    }

    return null;
}

type PostalAddress = {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
};

function findPostalAddress(node: unknown, depth = 0): string | null {
    if (!node || typeof node !== "object" || depth > 6) return null;

    if (Array.isArray(node)) {
        for (const item of node) {
            const found = findPostalAddress(item, depth + 1);
            if (found) return found;
        }

        return null;
    }

    const record = node as Record<string, unknown>;

    if (record["@type"] === "PostalAddress" || record.streetAddress) {
        const address = record as PostalAddress;

        const parts = [
            address.streetAddress,
            address.addressLocality,
            address.addressRegion,
            address.postalCode,
        ]
            .map((part) => (typeof part === "string" ? part.trim() : ""))
            .filter(Boolean);

        // A locality on its own is not an address worth posting to.
        if (parts.length >= 2 && parts.join(" ").length > 8) {
            return parts.join(", ");
        }
    }

    for (const value of Object.values(record)) {
        const found = findPostalAddress(value, depth + 1);
        if (found) return found;
    }

    return null;
}

// Failing that, the text around a postcode. Footers are where addresses
// live, and a postcode is the one part of a UK address that cannot be
// mistaken for prose.
function fromText(html: string): string | null {
    const text = html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<br\s*\/?>|<\/(p|div|li|address)>/gi, ", ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ");

    const match = POSTCODE.exec(text);

    if (!match) return null;

    const end = match.index + match[0].length;
    const before = text.slice(Math.max(0, match.index - 200), match.index);

    // Backwards from the postcode, a comma at a time, keeping the parts
    // that look like an address and stopping at the first that looks
    // like a sentence.
    //
    // Cutting at the previous full stop was not enough: "…at either time,
    // you can find us at either shop or get in touch below., Joe's
    // Bakery 240 Gloucester Road…" came back with the prose attached and
    // the first word sliced in half, which is not something you put on
    // an envelope.
    const parts = before.split(",").map((part) => part.trim()).filter(Boolean);
    const kept: string[] = [];

    for (let i = parts.length - 1; i >= 0; i -= 1) {
        const part = parts[i];

        // A sentence, not a line of an address: too long, or it ends
        // like prose. Either way, the address starts after it.
        if (part.length > 45 || /[.!?]$/.test(part) || part.split(/\s+/).length > 8) {
            break;
        }

        kept.unshift(part);

        // An address is a handful of lines. More than that and something
        // has gone wrong above.
        if (kept.length >= 5) break;
    }

    // A street number, in the part before the postcode. Without one this
    // is usually a sentence that happens to mention a postcode — "we
    // deliver to most of Bristol, including BS7 8NZ" — and posting to
    // that is worse than not having an address at all.
    //
    // It does mean "The Old Bakehouse, Church Lane" is missed. That is
    // the trade worth making: a miss is typed in by hand in a few
    // seconds, and a wrong address is a letter that never arrives.
    if (!/\d/.test(kept.join(" "))) {
        return null;
    }

    const tidy = [...kept, text.slice(match.index, end).trim()]
        .join(", ")
        .replace(/^[^A-Za-z0-9]+/, "")
        .trim();

    return tidy.length > 10 && tidy.length < 200 ? tidy : null;
}

export function addressFromHtml(html: string): string | null {
    return fromJsonLd(html) ?? fromText(html);
}
