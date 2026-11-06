import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

async function fillOffer(page: import("@playwright/test").Page, title: string) {
    await page.locator("#title").fill(title);
    await page.locator("#category").selectOption({ label: "Cafés & coffee" });
    await page.locator("#discount").fill("15% off");
    await page.locator("#description").fill("An offer created by the automated E2E test suite.");
    await page.locator("#expiresAt").fill("2030-12-31");
    await page.locator("#terms").fill("Valid during automated tests only. One per customer.");
}

test("business owner can create a new offer", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();

    const { data: before } = await client
        .from("businesses")
        .select("cover_image_url")
        .eq("id", businessId)
        .single();

    // A photo is required, and the business's cover photo stands in for
    // it in one tap. Borrow a real image for this run.
    const { data: picture } = await client
        .from("businesses")
        .select("cover_image_url")
        .not("cover_image_url", "is", null)
        .limit(1)
        .single();

    try {
        await page.goto(`/business/${businessId}/offers/new`);

        // Without a picture it doesn't save at all.
        await fillOffer(page, "E2E New Offer");
        await page.locator('button[type="submit"]').click();
        await expect(page.getByText(/Add a photo/)).toBeVisible();

        await client
            .from("businesses")
            .update({ cover_image_url: picture!.cover_image_url })
            .eq("id", businessId);

        await page.goto(`/business/${businessId}/offers/new`);
        await fillOffer(page, "E2E New Offer");
        await page.getByRole("button", { name: "Use my cover photo" }).click();
        await page.locator('button[type="submit"]').click();

        // Every offer waits for review, whatever the business's plan.
        // By role: Next's route announcer reads the same words out.
        await expect(page.getByRole("heading", { name: "Your offer is pending approval" })).toBeVisible({
            timeout: 10_000,
        });

        const { data: made } = await client
            .from("offers")
            .select("image_url")
            .eq("business_id", businessId)
            .eq("title", "E2E New Offer")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
        expect(made!.image_url, "the cover photo became the offer's picture").toBe(
            picture!.cover_image_url,
        );
    } finally {
        await client
            .from("businesses")
            .update({ cover_image_url: before!.cover_image_url })
            .eq("id", businessId);
    }
});
