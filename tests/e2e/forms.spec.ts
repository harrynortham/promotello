import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

// Forms validate with Zod and show what to fix under each field.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

test("sign-in explains what's missing without sending anything", async ({ page }) => {
    await page.goto("/login");
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await expect(page.locator("#login-email")).toHaveAttribute("aria-invalid", "true");

    await page.locator("#login-email").fill("not-an-email");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Enter an email address like name@example.com.")).toBeVisible();
});

test("the contact form asks for a longer message", async ({ page }) => {
    await page.goto("/contact");
    await page.locator("#consumer-contact-name").fill("E2E Tester");
    await page.locator("#consumer-contact-email").fill("e2e@test.internal");
    await page.locator("#consumer-contact-subject").fill("Hello");
    await page.locator("#consumer-contact-message").fill("Too short");
    await page.getByRole("button", { name: "Send your message" }).click();

    await expect(page.getByText("Write at least 20 characters so we can help.")).toBeVisible();
});

test.describe("business forms", () => {
    test.use({ storageState: BUSINESS_AUTH });

    test("onboarding checks each step before moving on", async ({ page }) => {
        await page.goto("/onboarding");
        await page.getByRole("button", { name: "Continue" }).click();

        await expect(page.getByText("The business name needs at least 2 characters.")).toBeVisible();
        await expect(page.getByText("Choose what kind of business it is.")).toBeVisible();
        await expect(page.getByRole("heading", { name: "Your business" })).toBeVisible();
    });

    test("editing a business saves its details", async ({ page }) => {
        const { businessId } = state();
        const description = `Edited by the forms test ${Date.now()}`;

        await page.goto(`/business/${businessId}/edit`);
        await page.locator("#description").fill(description);
        await page.locator("#website").fill("not a website");
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText("Enter a web address like https://example.com.")).toBeVisible();

        await page.locator("#website").fill("example.com");
        await page.locator("#category option").nth(1).waitFor({ state: "attached" });
        await page.locator("#category").selectOption({ index: 1 });
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText("Business details saved successfully.")).toBeVisible({ timeout: 10_000 });

        const supabase = admin();
        const { data: business } = await supabase.from("businesses").select("description, website_url").eq("id", businessId).single();
        expect(business).toEqual({ description, website_url: "https://example.com" });
    });

    test("opening hours start unset and save once every day is chosen", async ({ page }) => {
        const { businessId } = state();
        const supabase = admin();
        await supabase.from("business_hours").delete().eq("business_id", businessId);

        await page.goto(`/business/${businessId}/hours`);
        await expect(page.getByText("Not set yet")).toHaveCount(7);

        // Nothing chosen yet, so saving asks for every day.
        await page.getByRole("button", { name: "Save hours" }).click();
        await expect(page.getByText("Choose open or closed.").first()).toBeVisible();

        const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        for (const day of weekdays) {
            await page.getByRole("group", { name: `${day} open or closed` }).getByRole("button", { name: "Open" }).click();
            // An opened day starts at 9am to 5pm.
            await expect(page.getByLabel(`${day} opens`)).toHaveValue("09:00");
            await expect(page.getByLabel(`${day} closes`)).toHaveValue("17:00");
            await page.getByLabel(`${day} closes`).fill("18:30");
        }
        await page.getByRole("group", { name: "Sunday open or closed" }).getByRole("button", { name: "Closed" }).click();

        // Closing before opening is caught, matching the database rule.
        await page.getByLabel("Monday closes").fill("08:00");
        await page.getByRole("button", { name: "Save hours" }).click();
        await expect(page.getByText("The closing time must be after the opening time.")).toBeVisible();

        await page.getByLabel("Monday closes").fill("18:30");
        await page.getByRole("button", { name: "Save hours" }).click();
        await page.waitForURL(new RegExp(`/business/${businessId}$`), { timeout: 10_000 });

        const { data: rows } = await supabase
            .from("business_hours")
            .select("day_of_week, is_closed, opens_at, closes_at")
            .eq("business_id", businessId)
            .order("day_of_week");
        expect(rows).toHaveLength(7);
        expect(rows![0]).toMatchObject({ day_of_week: 0, is_closed: true, opens_at: null });
        expect(rows![1].closes_at).toMatch(/^18:30/);
        expect(rows![6].opens_at).toMatch(/^09:00/);
    });

    test("editing an offer validates and saves it", async ({ page }) => {
        const { businessId, businessUserId } = state();
        const supabase = admin();
        const { data: offer } = await supabase
            .from("offers")
            .insert({
                business_id: businessId,
                created_by: businessUserId,
                slug: crypto.randomUUID(),
                title: "E2E Offer To Edit",
                category: "Testing",
                discount: "10% off",
                description: "An offer for the edit form test.",
                availability: "Available now",
                expires_at: "2030-12-31",
                terms: "For automated tests only.",
                approval_status: "approved",
                redemption_count: 0,
            })
            .select("id")
            .single();

        try {
            await page.goto(`/business/${businessId}/offers/${offer!.id}/edit`);
            await expect(page.locator("#title")).toHaveValue("E2E Offer To Edit");

            await page.locator("#title").fill("");
            await page.locator("#maxRedemptions").fill("0");
            await page.getByRole("button", { name: "Save changes" }).click();
            await expect(page.getByText("The title needs at least 2 characters.")).toBeVisible();
            await expect(page.getByText("Use a number greater than zero.")).toBeVisible();

            await page.locator("#title").fill("E2E Offer Edited");
            await page.locator("#maxRedemptions").fill("25");
            await page.locator("#category").selectOption({ index: 1 });
            await page.getByRole("button", { name: "Save changes" }).click();
            await page.waitForURL(`**/business/${businessId}/offers`);

            const { data: saved } = await supabase.from("offers").select("title, max_redemptions").eq("id", offer!.id).single();
            expect(saved).toEqual({ title: "E2E Offer Edited", max_redemptions: 25 });
        } finally {
            await supabase.from("offers").delete().eq("id", offer!.id);
        }
    });
});
