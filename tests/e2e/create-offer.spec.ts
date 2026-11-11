import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// The headline isn't typed any more: a type is chosen and the number it
// needs is filled in, and we build "15% off" from those.
async function fillOffer(page: import("@playwright/test").Page, title: string) {
    await page.locator("#title").fill(title);
    await page.locator("#category").selectOption({ label: "Cafés & coffee" });
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

    // The card beside the form is what they are making, so it shows the
    // photo straight away — before it is uploaded, from the browser's own
    // copy of it.
    const inPreview = page.locator('[data-slot="offer-card"] img').first();
    await expect(inPreview).toBeVisible();
    await expect(inPreview).toHaveAttribute("src", /^blob:/);

    await page.locator('button[type="submit"]').click();

    // Every offer waits for review, whatever the business's plan.
    // By role: Next's route announcer reads the same words out.
    await expect(page.getByRole("heading", { name: "Your offer is pending approval" })).toBeVisible({
        timeout: 20_000,
    });

    const { data: made } = await client
        .from("offers")
        .select("id, image_url, kind, kind_value, kind_item, discount")
        .eq("business_id", businessId)
        .eq("title", "E2E New Offer")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    try {
        expect(made!.image_url, "the photo was uploaded with it").toMatch(/^https?:\/\//);

        // The type is saved beside the headline we wrote from it, so the
        // offer can be filtered by type and the headline can't be mistyped.
        expect(made!.kind).toBe("percent_off");
        expect(Number(made!.kind_value)).toBe(15);
        expect(made!.kind_item, "no item was given").toBeNull();
        expect(made!.discount, "built from the type").toBe("15% off");
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

// "Something else" is the only way to write a headline by hand, for the
// offers none of the types fit.
test("an offer that fits no type is written out in full", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();

    await page.goto(`/business/${businessId}/offers/new`);
    await expect(page.locator("#title")).toBeVisible({ timeout: 15_000 });

    await page.locator("#title").fill("E2E Something Else Offer");
    await page.locator("#category").selectOption({ label: "Cafés & coffee" });
    await page.locator("#kind").selectOption("other");

    // Only this type has a headline box at all.
    await page.locator("#discount").fill("3rd half price");
    await expect(page.locator("#kindValue")).toHaveCount(0);

    await page.locator("#description").fill("An offer created by the automated E2E test suite.");
    await page.locator("#expiresAt").fill("2030-12-31");
    await page.locator("#terms").fill("Valid during automated tests only. One per customer.");

    await page.locator("#image").setInputFiles("tests/fixtures/offer-photo.jpg");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Use this image" }).click();
    await expect(dialog).toBeHidden();

    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("heading", { name: "Your offer is pending approval" })).toBeVisible({
        timeout: 20_000,
    });

    const { data: made } = await client
        .from("offers")
        .select("id, image_url, kind, kind_value, kind_quantity, kind_item, discount")
        .eq("business_id", businessId)
        .eq("title", "E2E Something Else Offer")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    try {
        expect(made!.kind).toBe("other");
        expect(made!.discount, "exactly as it was written").toBe("3rd half price");
        expect([made!.kind_value, made!.kind_quantity, made!.kind_item], "nothing else to save").toEqual([
            null,
            null,
            null,
        ]);
    } finally {
        await client.from("offers").delete().eq("id", made!.id);

        const path = made!.image_url?.split("/offer-images/")[1];
        if (path) await client.storage.from("offer-images").remove([path]);
    }
});
