import { test, expect } from "@playwright/test";
import fs from "fs";

import { STATE_PATH } from "../global-setup";

// What a crawler gets from the pages we want found: one canonical, a title
// and description of its own, a link preview that exists, and structured
// data saying what the page is.

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

type Head = {
    canonical: string | null;
    title: string;
    description: string | null;
    ogImage: string | null;
    types: string[];
};

async function headOf(page: import("@playwright/test").Page, path: string): Promise<Head> {
    await page.goto(path);

    return page.evaluate(() => ({
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
        ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null,
        types: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((node) => {
            const data = JSON.parse(node.textContent ?? "{}");
            return (data["@graph"] ?? [data]).map((item: { "@type": string }) => item["@type"]);
        }),
    }));
}

test("every page we want found says what it is", async ({ page }) => {
    const { businessSlug, claimOfferSlug } = state();

    const pages: [string, string[]][] = [
        ["/", ["Organization", "WebSite"]],
        ["/offers", []],
        ["/businesses", []],
        ["/explore", []],
        ["/categories", []],
        ["/offers/bristol", ["BreadcrumbList"]],
        ["/businesses/bristol", ["BreadcrumbList"]],
        [`/offers/${claimOfferSlug}`, ["Offer", "BreadcrumbList"]],
        [`/businesses/${businessSlug}`, ["LocalBusiness", "BreadcrumbList"]],
    ];

    for (const [path, types] of pages) {
        const head = await headOf(page, path);

        expect(head.canonical, `${path} canonical`).toBeTruthy();
        expect(head.canonical, `${path} canonical is absolute`).toMatch(/^https?:\/\//);
        expect(head.title.length, `${path} title`).toBeGreaterThan(10);
        expect(head.description?.length ?? 0, `${path} description`).toBeGreaterThan(30);
        expect(head.ogImage, `${path} og:image`).toBeTruthy();

        for (const type of types) {
            expect(head.types, `${path} structured data`).toContain(type);
        }
    }
});

test("the link preview for a city listing is a real image", async ({ page, request }) => {
    // The share image route sits on /offers/<slug>, which is an offer for
    // most slugs and a city listing for a few: both have to answer.
    for (const path of ["/offers/bristol", "/businesses/bristol", "/"]) {
        const url = await headOf(page, path).then((head) => head.ogImage!);
        const image = await request.get(url);

        expect(image.status(), `${path} share image`).toBe(200);
        expect(image.headers()["content-type"], `${path} share image`).toContain("image/");
    }
});

test("a city's listing is canonical to itself, however it was reached", async ({ page }) => {
    // Filters and screenfuls are the same page, so they point back at it
    // rather than competing with it.
    for (const path of ["/offers/bristol?area=Clifton", "/offers/bristol?show=48", "/businesses/bristol?show=36"]) {
        const head = await headOf(page, path);
        expect(head.canonical, path).toBe(`https://www.promotello.com${path.split("?")[0]}`);
    }
});
