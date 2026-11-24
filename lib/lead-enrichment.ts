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
//
// Exported because the same question is asked when a lead is added —
// is this one already written down? — and two answers to "are these the
// same shop" would disagree the first time somebody typed an
// apostrophe.
export function compare(value: string) {
    return value
        .toLowerCase()
        .replace(/&/g, " and ")
        // Apostrophes vanish rather than becoming a space. The register
        // writes JOE'S BAKERY LIMITED and the lead says Joes Bakery; as
        // a space those were "joe s bakery" and "joes bakery", which
        // never matched, so every shop named after a person — Joe's,
        // Sam's, Nando's — was quietly unemailable and got a letter
        // instead. The curly ones too: a name pasted from a website
        // carries U+2019 far more often than a typed one.
        .replace(/['\u2018\u2019\u0060\u00b4]/g, "")
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
//
// The letters are restricted to the ones Royal Mail actually uses, not
// A-Z. [A-Z]{1,2}\d… also matches "Q1 2PS", and a crawled page produced
// exactly that out of some minified script left on the page — which then
// dragged four lines of junk in front of it onto an envelope. No real
// postcode starts with Q, V or X, takes I, J or Z as its second letter,
// or ends in C, I, K, M, O or V, so spelling that out costs nothing and
// throws the false anchors away before anything is built on them.
const POSTCODE = /\b([A-PR-UWYZ][A-HK-Y]?\d[A-HJKPSTUW\d]?)\s*(\d[ABD-HJLNP-UW-Z]{2})\b/i;

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
// What a footer says around an address rather than in it. Matched at
// the start of a part, so a street called Market Place is untouched.
const ASKS_YOU_TO =
    /^(find|see|rent|contact|follow|book|call|email|visit|shop|buy|order|subscribe|join|read|learn|discover|explore|click|download|sign|get in touch|opening|open)\b/i;

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

        // An address line is not an email or a link. Footers put both
        // right beside the address, and "info@432studios.co.uk" came
        // through as the first line of one.
        if (/@|https?:|www\./i.test(part)) {
            break;
        }

        // Nor does a street carry quotes or braces. Those belong to
        // script or JSON that outlived the tag stripping above, and
        // they are the shape the junk arrives in when it does.
        if (/["{}[\]]/.test(part)) {
            break;
        }

        // Nor is it an invitation. "Find us on Spotify", "Rent our
        // space", "See our classes" are all short enough and
        // punctuated like an address line, and all three ended up on
        // envelopes in a real import.
        if (ASKS_YOU_TO.test(part)) {
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

// The blob, in the shape the preview form takes.
//
// The preview wants a street line, a city, an area and a postcode. A
// lead has one line of text, so this splits it on commas from the right:
// the postcode if there is one, then the town, and whatever is left is
// the street.
//
// It is deliberately dumb, and it does not try to name the city or the
// area — the import already knows those as ids, and they are the two
// parts an address written by hand most often gets wrong. Somebody
// checks the result; address_source says whether anybody has.
export function splitAddress(address: string | null | undefined) {
    const parts = (address ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

    const postcode = postcodeFrom(address ?? "");

    // The postcode's own part drops out, wherever it sits — usually last,
    // and sometimes with the town: "Bristol BS7 8NZ".
    const withoutPostcode = parts
        .map((part) => (POSTCODE.test(part) ? part.replace(POSTCODE, "").trim() : part))
        .filter(Boolean);

    // The last part left is the town, which the preview takes from the
    // city list rather than from here.
    const line1 = withoutPostcode.slice(0, -1).join(", ") || withoutPostcode.join(", ");

    return {
        line1: line1 || null,
        town: withoutPostcode.length > 1 ? withoutPostcode[withoutPostcode.length - 1] : null,
        postcode,
    };
}

// ---------------------------------------------------------------------------
// Opening hours, from the business's own website
// ---------------------------------------------------------------------------
//
// Read here rather than from Google, deliberately. The Places policies
// name "copy and save business names, addresses" as a prohibited use and
// permit storing nothing but the place_id, so hours from Maps are not
// ours to keep (lib/google-places.ts). Hours a business publishes on its
// own site are a different thing entirely: they put them there to be
// read, and this is the same source and the same justification as the
// email crawl above.
//
// Only structured hours are taken. Most sites that bother to publish
// opening times put them in schema.org JSON-LD, because that is what
// gets them the hours panel in a search result — and a machine-readable
// block is the one place on a web page where "Mon 9-5" is not a guess.
// Prose is left alone: a page that says "open late on Fridays" is not
// something to turn into 21:00 on somebody else's listing.

export type OpeningHours = {
    // 0 is Sunday, matching business_hours.day_of_week.
    day_of_week: number;
    is_closed: boolean;
    opens_at: string | null;
    closes_at: string | null;
};

const DAY_NUMBERS: Record<string, number> = {
    sunday: 0, sun: 0, su: 0,
    monday: 1, mon: 1, mo: 1,
    tuesday: 2, tue: 2, tues: 2, tu: 2,
    wednesday: 3, wed: 3, we: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4, th: 4,
    friday: 5, fri: 5, fr: 5,
    saturday: 6, sat: 6, sa: 6,
};

function dayNumber(value: unknown): number | null {
    if (typeof value !== "string") return null;

    // schema.org writes these as URLs: https://schema.org/Monday.
    const word = value.trim().toLowerCase().split("/").pop() ?? "";
    const day = DAY_NUMBERS[word];

    return day === undefined ? null : day;
}

// "09:00", "9:00 am", "09:00:00". Returned as HH:MM, which is what the
// column holds.
function timeOfDay(value: unknown): string | null {
    if (typeof value !== "string") return null;

    const match = value.trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)?/i);

    if (!match) return null;

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const half = match[3]?.toLowerCase();

    if (!Number.isInteger(hour) || hour > 23 || minute > 59) return null;

    if (half === "pm" && hour < 12) hour += 12;
    if (half === "am" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function everyJsonLd(html: string): unknown[] {
    const blocks: unknown[] = [];

    for (const match of html.matchAll(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )) {
        try {
            blocks.push(JSON.parse(match[1].trim()));
        } catch {
            // Somebody else's page. A block that will not parse is not
            // worth a repair attempt.
        }
    }

    return blocks;
}

// Walks whatever shape the page used: a bare object, an array, or
// @graph, nested as deeply as it likes.
function collectSpecs(node: unknown, found: unknown[]) {
    if (Array.isArray(node)) {
        for (const item of node) collectSpecs(item, found);
        return;
    }

    if (!node || typeof node !== "object") return;

    const record = node as Record<string, unknown>;

    if (record.openingHoursSpecification) {
        const spec = record.openingHoursSpecification;
        found.push(...(Array.isArray(spec) ? spec : [spec]));
    }

    for (const value of Object.values(record)) {
        if (value && typeof value === "object") collectSpecs(value, found);
    }
}

export function hoursFromHtml(html: string): OpeningHours[] | null {
    const specs: unknown[] = [];

    for (const block of everyJsonLd(html)) collectSpecs(block, specs);

    if (specs.length === 0) return null;

    // Days nobody mentioned are closed. A site that lists Monday to
    // Friday is saying it is shut at the weekend, and a table with two
    // blank rows reads as missing data rather than as a closed shop.
    const week = new Map<number, OpeningHours>();

    for (const spec of specs) {
        if (!spec || typeof spec !== "object") continue;

        const record = spec as Record<string, unknown>;
        const days = Array.isArray(record.dayOfWeek) ? record.dayOfWeek : [record.dayOfWeek];
        const opens = timeOfDay(record.opens);
        const closes = timeOfDay(record.closes);

        for (const day of days) {
            const number = dayNumber(day);

            if (number === null) continue;

            // A spec with no usable times is the page saying the shop is
            // shut that day, which is worth keeping.
            week.set(number, {
                day_of_week: number,
                is_closed: !opens || !closes,
                opens_at: opens && closes ? opens : null,
                closes_at: opens && closes ? closes : null,
            });
        }
    }

    if (week.size === 0) return null;

    // Nothing worth writing down: every day shut is a page we have
    // misread far more often than it is a business that never opens.
    if ([...week.values()].every((day) => day.is_closed)) return null;

    return Array.from({ length: 7 }, (_, day) =>
        week.get(day) ?? { day_of_week: day, is_closed: true, opens_at: null, closes_at: null },
    );
}
