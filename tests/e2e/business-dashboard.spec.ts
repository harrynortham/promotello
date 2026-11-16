import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// The shell every business dashboard page sits in: the sidebar, and what
// it offers wherever you are in the dashboard.

test.use({ storageState: BUSINESS_AUTH });

test("the sidebar links out to the page customers see", async ({ page }) => {
    const { businessId, businessSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // Not only the overview, which already had a button of its own.
    for (const path of [`/business/${businessId}`, `/business/${businessId}/offers`, `/business/${businessId}/qr`]) {
        await page.goto(path);

        const link = page.getByRole("link", { name: /Open .* page in a new tab/ });
        await expect(link, path).toHaveAttribute("href", `/businesses/${businessSlug}`);
        // A new tab: the dashboard is somewhere they are working.
        await expect(link, path).toHaveAttribute("target", "_blank");
    }

    // It is beside the name, not in the navigation below it.
    const beside = await page.evaluate(() => {
        const link = document.querySelector('aside a[aria-label^="Open "]');
        const heading = link?.closest("h2");
        return Boolean(heading && heading.textContent?.trim());
    });

    expect(beside, "the link sits with the business name").toBe(true);
});

// The same link on a phone, where the sidebar isn't: once in the header
// above the Menu button, and once in the menu itself.
test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    // Four counts stacked full width took 492px — most of a screen for
    // four numbers — so they sit two across.
    test("the counts sit two across", async ({ page }) => {
        const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

        await page.goto(`/business/${businessId}`);

        const tile = (name: string) =>
            page.locator('[data-slot="card"]').filter({ hasText: name }).first();

        await expect(tile("Total offers")).toBeVisible({ timeout: 25_000 });

        const boxes = await Promise.all(
            ["Total offers", "Approved offers", "Total claims", "Redemptions"].map(async (name) =>
                (await tile(name).boundingBox())!,
            ),
        );

        // Two on the first line, two on the second.
        expect(Math.round(boxes[0].y), "the first two share a line").toBe(Math.round(boxes[1].y));
        expect(boxes[2].y, "and the next two are below them").toBeGreaterThan(boxes[0].y);
        expect(Math.round(boxes[2].y), "sharing a line of their own").toBe(Math.round(boxes[3].y));

        // Half a 390px screen each, give or take the gap.
        expect(boxes[0].width).toBeLessThan(200);

        const height = boxes[3].y + boxes[3].height - boxes[0].y;
        expect(height, "all four in less than half the screen").toBeLessThan(300);
    });

    test("the link out sits in the header and in the menu", async ({ page }) => {
        const { businessId, businessSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

        await page.goto(`/business/${businessId}`);

        const header = page.getByRole("link", { name: /Open .* page in a new tab/ });
        await expect(header).toBeVisible();
        await expect(header).toHaveAttribute("href", `/businesses/${businessSlug}`);
        await expect(header).toHaveAttribute("target", "_blank");

        await page.getByRole("button", { name: "Menu", exact: true }).click();

        const inMenu = page.getByRole("dialog").getByRole("link", { name: /Open .* page in a new tab/ });
        await expect(inMenu).toBeVisible();
        await expect(inMenu).toHaveAttribute("href", `/businesses/${businessSlug}`);
        await expect(inMenu).toHaveAttribute("target", "_blank");
    });
});

// Somebody paying should be able to see what they are paying for
// without opening Billing. Nothing is shown on Free: a badge saying so
// would label most businesses with the one thing they have not done,
// every time they open the dashboard.
test("the sidebar says which plan this business is on, and says nothing on Free", async ({ page }) => {
    test.setTimeout(120_000);
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: before } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, tier")
        .eq("business_id", state.businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const asTier = (tier: string) =>
        admin.from("subscriptions").update({ tier }).eq("stripe_subscription_id", before!.stripe_subscription_id);

    // Scoped to the sidebar: the checklist puts its own "Pro" pills
    // beside the steps that need it, and those are a different thing.
    const badge = page.locator("aside").getByText(/^(Pro|Growth)$/);

    try {
        await asTier("pro");
        await page.goto(`/business/${state.businessId}`, { timeout: 120_000 });
        await expect(badge, "Pro is named").toHaveText("Pro", { timeout: 60_000 });

        await asTier("growth");
        await page.reload({ timeout: 120_000 });
        await expect(badge, "and so is Growth").toHaveText("Growth", { timeout: 60_000 });

        // The free business has no subscription at all, so there is
        // nothing to say and nothing is said.
        await page.goto(`/business/${state.freeBusinessId}`, { timeout: 120_000 });
        await expect(page.locator("aside").getByText("Overview")).toBeVisible({ timeout: 60_000 });
        await expect(badge, "and Free is left alone").toHaveCount(0);
    } finally {
        await asTier(before!.tier);
    }
});
