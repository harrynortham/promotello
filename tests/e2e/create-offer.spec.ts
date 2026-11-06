import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

test("business owner can create a new offer", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/offers/new`);

    // Fill all required fields.
    await page.locator("#title").fill("E2E New Offer");
    await page.locator("#category").selectOption({ label: "Cafés & coffee" });
    await page.locator("#discount").fill("15% off");
    await page.locator("#description").fill(
        "An offer created by the automated E2E test suite.",
    );
    await page.locator("#expiresAt").fill("2030-12-31");
    await page.locator("#terms").fill("Valid during automated tests only. One per customer.");

    await page.locator('button[type="submit"]').click();

    // Every offer waits for review, whatever the business's plan.
    // By role: Next's route announcer reads the same words out.
    await expect(page.getByRole("heading", { name: "Your offer is pending approval" })).toBeVisible({
        timeout: 10_000,
    });
});

// An offer isn't always money off. The field has always been free text,
// but it was labelled Discount with "20% off" in it, so it read as the
// only kind we take.
test("the offer field asks for any kind of offer, and the card carries one", async ({ page }) => {
    const { businessId, businessSlug, businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/offers/new`);
    await expect(page.getByLabel(/^The offer/)).toBeVisible();
    await expect(page.getByText(/2 for 1/)).toBeVisible();

    // A long one: the badge has to stay clear of the "ends" pill beside it.
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: made } = await admin
        .from("offers")
        .insert({
            business_id: businessId,
            created_by: businessUserId,
            slug: `e2e-kind-${Date.now()}`,
            title: "E2E Two for one",
            category: "Testing",
            discount: "Free side with any main course plus a drink for the table",
            description: "An offer that isn't a percentage.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
        })
        .select("id")
        .single();

    try {
        await page.goto(`/businesses/${businessSlug}`);

        const card = page.locator('[data-slot="offer-card"]', { hasText: "E2E Two for one" }).first();
        await expect(card).toBeVisible();

        const gap = await card.evaluate((node) => {
            const badge = node.querySelector("span.bg-\\[\\#FF593F\\]");
            const ends = [...node.querySelectorAll("span")].find((el) => /Ends/.test(el.textContent ?? ""));
            if (!badge || !ends) return null;
            return ends.getBoundingClientRect().left - badge.getBoundingClientRect().right;
        });

        expect(gap, "the offer and the end date don't collide").not.toBeNull();
        expect(gap!).toBeGreaterThan(0);
    } finally {
        await admin.from("offers").delete().eq("id", made!.id);
    }
});
