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
    // The kind writes the headline; the headline can still be changed.
    await page.locator("#kind").selectOption("percent_off");
    await page.locator("#kindValue").fill("15");
    await page.locator("#description").fill("An offer created by the automated E2E test suite.");
    await page.locator("#expiresAt").fill("2030-12-31");
    await page.locator("#terms").fill("Valid during automated tests only. One per customer.");
}

test("business owner can create a new offer", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();

    await page.goto(`/business/${businessId}/offers/new`);

    // Without a picture it doesn't save at all.
    await fillOffer(page, "E2E New Offer");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/Add a photo/)).toBeVisible();

    await page.locator("#image").setInputFiles("tests/fixtures/offer-photo.jpg");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Use this image" }).click();
    await expect(dialog).toBeHidden();

    await page.locator('button[type="submit"]').click();

    // Every offer waits for review, whatever the business's plan.
    // By role: Next's route announcer reads the same words out.
    await expect(page.getByRole("heading", { name: "Your offer is pending approval" })).toBeVisible({
        timeout: 20_000,
    });

    const { data: made } = await client
        .from("offers")
        .select("id, image_url, discount, kind, kind_value")
        .eq("business_id", businessId)
        .eq("title", "E2E New Offer")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    try {
        expect(made!.image_url, "the photo was uploaded with it").toMatch(/^https?:\/\//);

        // The kind is stored as a fact, and it wrote the headline.
        expect(made!.kind).toBe("percent_off");
        expect(Number(made!.kind_value)).toBe(15);
        expect(made!.discount).toBe("15% off");
    } finally {
        await client.from("offers").delete().eq("id", made!.id);

        const path = made!.image_url?.split("/offer-images/")[1];
        if (path) await client.storage.from("offer-images").remove([path]);
    }
});

// Choosing a photo used to swap the field for a cropper in the middle of
// a long form, and people walked on without pressing Use this image. It
// is a dialog now, which has to be answered one way or the other.
test("a photo is cropped in a dialog, and only counts once it is confirmed", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const photo = "tests/fixtures/offer-photo.jpg";

    await page.goto(`/business/${businessId}/offers/new`);
    await expect(page.locator("#title")).toBeVisible({ timeout: 15_000 });

    // Walking away from it leaves the form without a photo.
    await page.locator("#image").setInputFiles(photo);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Use this image" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator('img[src^="blob:"]')).toHaveCount(0);

    await fillOffer(page, "E2E Cropped Offer");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/Add a photo/)).toBeVisible();

    // Confirming it fills the field, and the offer saves.
    await page.locator("#image").setInputFiles(photo);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Use this image" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('img[src^="blob:"]').first()).toBeVisible();

    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("heading", { name: "Your offer is pending approval" })).toBeVisible({
        timeout: 20_000,
    });

    const client = admin();
    const { data: made } = await client
        .from("offers")
        .select("id, image_url")
        .eq("business_id", businessId)
        .eq("title", "E2E Cropped Offer")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    try {
        expect(made!.image_url, "the cropped photo was uploaded").toMatch(/^https?:\/\//);
    } finally {
        await client.from("offers").delete().eq("id", made!.id);

        // The upload itself, which deleting the row leaves behind.
        const path = made!.image_url?.split("/offer-images/")[1];
        if (path) await client.storage.from("offer-images").remove([path]);
    }
});

// The picker is the point of the kind: it writes a consistent headline
// and stops "20% offer" ever being typed again. It is a default, not a
// cage — a business can still write its own words over it.
test("the kind writes the headline, and the business can write over it", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/offers/new`);
    await expect(page.locator("#kind")).toBeVisible({ timeout: 20_000 });

    // No number to give for a freebie, because there isn't one.
    await page.locator("#kind").selectOption("freebie");
    await expect(page.locator("#kindValue")).toHaveCount(0);

    await page.locator("#kind").selectOption("percent_off");
    await page.locator("#kindValue").fill("20");
    await expect(page.locator("#discount")).toHaveValue("20% off");

    // It follows the number while nobody has said otherwise.
    await page.locator("#kindValue").fill("25");
    await expect(page.locator("#discount")).toHaveValue("25% off");

    // And stops the moment they do.
    await page.locator("#discount").fill("25% off everything");
    await page.locator("#kindValue").fill("30");
    await expect(page.locator("#discount")).toHaveValue("25% off everything");

    // A kind that needs a number won't save without one.
    await page.locator("#kindValue").fill("");
    await page.locator("#title").fill("E2E Kind Check");
    await page.locator("#description").fill("Checking the kind rules.");
    await page.locator("#expiresAt").fill("2030-12-31");
    await page.locator("#terms").fill("For automated tests only.");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Add the number for this kind of offer.")).toBeVisible();
});
