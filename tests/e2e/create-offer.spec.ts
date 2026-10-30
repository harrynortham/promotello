import { test, expect } from "@playwright/test";
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

    // The test business is approved and on Pro, so the offer goes live at once.
    await expect(page.getByText("Your offer is live")).toBeVisible({
        timeout: 10_000,
    });
});
