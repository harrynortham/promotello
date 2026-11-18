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
