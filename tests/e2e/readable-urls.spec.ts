import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH } from "../global-setup";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

test("business pages live at their name and id, and old links redirect permanently", async ({ page, request }) => {
    const { businessId, businessSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    expect(businessSlug).toMatch(/^e2e-test-business(-[a-z0-9-]+)?-[a-z0-9]{6}$/);
    const id = businessSlug.slice(-6);

    // The old /businesses/<uuid> links (QR codes use these too).
    const old = await request.get(`/businesses/${businessId}?ref=qr`, { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers()["location"]).toBe(`/businesses/${businessSlug}?ref=qr`);

    // An outdated name or area with the right id, e.g. after a rename.
    const renamed = await request.get(`/businesses/old-name-somewhere-${id}`, { maxRedirects: 0 });
    expect(renamed.status()).toBe(308);
    expect(renamed.headers()["location"]).toBe(`/businesses/${businessSlug}`);

    await page.goto(`/businesses/${businessSlug}`);
    await expect(page.getByRole("heading", { name: "E2E Test Business" })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/businesses/${businessSlug}$`));
});

test("offer addresses include the business name, and old ones redirect", async ({ page, request }) => {
    const { claimOfferSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    expect(claimOfferSlug).toMatch(/^e2e-test-business-[a-z0-9-]+-[a-z0-9]{6}$/);

    const renamed = await request.get(`/offers/an-old-title-${claimOfferSlug.slice(-6)}`, { maxRedirects: 0 });
    expect(renamed.status()).toBe(308);
    expect(renamed.headers()["location"]).toBe(`/offers/${claimOfferSlug}`);

    // Offers created before readable addresses keep working.
    const { data: offer } = await admin().from("offers").select("id").eq("slug", claimOfferSlug).single();
    const legacy = `e2e-legacy-offer-${Date.now().toString(16).slice(-6)}`;
    await admin().from("offer_slug_history").insert({ slug: legacy, offer_id: offer!.id });

    try {
        const old = await request.get(`/offers/${legacy}`, { maxRedirects: 0 });
        expect(old.status()).toBe(308);
        expect(old.headers()["location"]).toBe(`/offers/${claimOfferSlug}`);

        await page.goto(`/offers/${legacy}`);
        await page.waitForURL(`**/offers/${claimOfferSlug}`);
    } finally {
        await admin().from("offer_slug_history").delete().eq("slug", legacy);
    }
});

test("an unknown business address shows the not-found page", async ({ page }) => {
    for (const path of ["/businesses/no-such-business-here", "/businesses/00000000-0000-4000-8000-000000000000"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: /wasn.t the discovery you had in mind/ }), path).toBeVisible();
    }
});
