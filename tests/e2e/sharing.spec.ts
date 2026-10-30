import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

test("businesses can share an offer from their offers list", async ({ browser, request }) => {
    const { businessId, claimOfferSlug } = state();
    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    await page.goto(`/business/${businessId}/offers`);
    await page.getByRole("button", { name: "Share" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Share this offer" })).toBeVisible();
    await expect(dialog.locator("code").first()).toContainText("?ref=share");
    await expect(dialog.locator("a[href^=\"https://wa.me/\"]")).toBeVisible();
    await expect(dialog.getByText(/views of this offer/)).toBeVisible();

    for (const image of ["story-image", "post-image"]) {
        const response = await request.get(`/offers/${claimOfferSlug}/${image}`);
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("image/png");
    }
});

test("offer pages have a share button and a link preview image", async ({ page }) => {
    const { claimOfferSlug } = state();

    await page.goto(`/offers/${claimOfferSlug}`);
    await expect(page.getByRole("button", { name: "Share with a friend" })).toBeVisible();

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toContain("opengraph-image");
    const response = await page.request.get(new URL(ogImage!).pathname + new URL(ogImage!).search);
    expect(response.headers()["content-type"]).toContain("image/png");
});

test("visits from shared links are counted as shares", async ({ browser }) => {
    const { businessId, claimOfferSlug } = state();
    const since = new Date().toISOString();

    const visitor = await (await browser.newContext()).newPage();
    const recorded = visitor.waitForResponse((response) => response.url().includes("/rpc/record_page_view"));
    await visitor.goto(`/offers/${claimOfferSlug}?ref=share`);
    expect((await recorded).ok()).toBe(true);

    const { data } = await admin()
        .from("page_views")
        .select("source")
        .eq("business_id", businessId)
        .gte("viewed_at", since);
    expect(data?.some((row) => row.source === "share")).toBe(true);
});
