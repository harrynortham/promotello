import {
    bestEmail,
    contactPaths,
    emailsFromHtml,
    matchCompany,
    type CompanyCandidate,
    type CompanyMatch,
} from "@/lib/lead-enrichment";

// The two jobs that touch somebody else's server: reading a business's own
// website for the address they publish, and asking Companies House whether
// they are a limited company.
//
// Both need a key and both do nothing without one, the same way
// lib/email.ts sends nothing locally. A missing key is a configuration
// problem, not a crash, and the dashboard says which one is missing.
//
// The decisions all live in lib/lead-enrichment.ts, which is pure and
// tested. Nothing here decides anything.

const AGENT =
    "PromotelloBot/1.0 (+https://www.promotello.com/about; local directory; hello@promotello.com)";

// Somebody else's server, visited once by one person deciding whether to
// write to them. Short, and it gives up rather than hanging on.
const TIMEOUT = 8000;

async function get(url: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        const response = await fetch(url, {
            headers: { "user-agent": AGENT, accept: "text/html,*/*" },
            redirect: "follow",
            signal: controller.signal,
        });

        if (!response.ok) return null;

        const type = response.headers.get("content-type") ?? "";
        if (!type.includes("html") && !type.includes("text")) return null;

        // A page far larger than this is not a contact page.
        const body = await response.text();
        return body.slice(0, 500_000);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

// Asked before anything else is. A site that says not to read it is not
// read, even though one page for one business is not what robots.txt is
// usually guarding against — the point is that we are the kind of
// visitor that checks.
async function allowed(origin: string, path: string) {
    const robots = await get(`${origin}/robots.txt`);

    if (!robots) return true;

    let appliesToUs = false;

    for (const line of robots.split(/\r?\n/)) {
        const [rawField, ...rest] = line.split("#")[0].split(":");
        const field = rawField.trim().toLowerCase();
        const value = rest.join(":").trim();

        if (field === "user-agent") {
            appliesToUs = value === "*" || value.toLowerCase().includes("promotello");
            continue;
        }

        if (appliesToUs && field === "disallow" && value) {
            if (value === "/" || path.startsWith(value)) return false;
        }
    }

    return true;
}

export type EmailSearch =
    | { found: true; email: string; source: string }
    | { found: false; reason: "no_website" | "unreachable" | "blocked" | "nothing_published" };

// The address a business publishes on its own site, and the page it was
// on. Three requests at the very most: the home page, and up to two pages
// it links to that look like a way of getting in touch.
export async function findEmail(website: string | null | undefined): Promise<EmailSearch> {
    if (!website?.trim()) {
        return { found: false, reason: "no_website" };
    }

    let home: URL;

    try {
        home = new URL(website.startsWith("http") ? website : `https://${website}`);
    } catch {
        return { found: false, reason: "no_website" };
    }

    if (!(await allowed(home.origin, home.pathname))) {
        return { found: false, reason: "blocked" };
    }

    const landing = await get(home.toString());

    if (!landing) {
        return { found: false, reason: "unreachable" };
    }

    const onLanding = bestEmail(emailsFromHtml(landing), home.host);

    if (onLanding) {
        return { found: true, email: onLanding, source: home.toString() };
    }

    for (const path of contactPaths(landing, home.toString())) {
        if (!(await allowed(home.origin, new URL(path).pathname))) continue;

        const page = await get(path);
        if (!page) continue;

        const onPage = bestEmail(emailsFromHtml(page), home.host);
        if (onPage) return { found: true, email: onPage, source: path };
    }

    return { found: false, reason: "nothing_published" };
}

// Companies House. The key is free from their developer portal and the
// data is Open Government Licence, so unlike the Places result this is
// ours to keep. Basic auth with the key as the username and no password.
export async function searchCompanies(name: string): Promise<CompanyCandidate[] | null> {
    const key = process.env.COMPANIES_HOUSE_API_KEY?.trim();

    if (!key) return null;

    const url = new URL("https://api.company-information.service.gov.uk/search/companies");
    url.searchParams.set("q", name);
    url.searchParams.set("items_per_page", "20");

    try {
        const response = await fetch(url, {
            headers: {
                authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
                accept: "application/json",
            },
        });

        if (!response.ok) {
            console.error("Companies House search failed", response.status);
            return null;
        }

        const body = (await response.json()) as { items?: CompanyCandidate[] };

        return body.items ?? [];
    } catch (error) {
        console.error("Companies House search failed", error);
        return null;
    }
}

export type CompaniesHouseResult = CompanyMatch | { confident: false; reason: "no_key" | "unreachable" };

export async function checkCompaniesHouse(
    name: string,
    postcode: string | null | undefined,
): Promise<CompaniesHouseResult> {
    const candidates = await searchCompanies(name);

    if (candidates === null) {
        return {
            confident: false,
            reason: process.env.COMPANIES_HOUSE_API_KEY?.trim() ? "unreachable" : "no_key",
        };
    }

    return matchCompany(name, postcode, candidates);
}
