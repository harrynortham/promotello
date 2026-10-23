import { test, expect } from "@playwright/test";
import fs from "fs";
import { STATE_PATH, CUSTOMER_AUTH } from "../global-setup";

test.use({ storageState: CUSTOMER_AUTH });

test("signed-in customer can claim an approved offer", async ({ page }) => {
    const { claimOfferSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/offers/${claimOfferSlug}`);

    // The redeem button is visible for authenticated users who haven't claimed yet.
    const claimButton = page.getByRole("button", { name: "Get this deal" });
    await expect(claimButton).toBeVisible({ timeout: 10_000 });

    await claimButton.click();

    // After a successful claim the redemption code card replaces the button.
    await expect(page.getByText("Your claimed voucher")).toBeVisible({ timeout: 10_000 });

    // The code should be a non-empty monospace string.
    const codeEl = page.locator(".font-mono").first();
    const code = (await codeEl.textContent())?.trim() ?? "";
    expect(code.length).toBeGreaterThan(0);
});

test.describe("signed out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("logging in from an offer returns the customer to that offer", async ({ page }) => {
        const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

        await page.goto(`/offers/${state.claimOfferSlug}`);
        await page.getByText("Log in to claim this deal").click();

        await page.locator("#login-email").fill(state.customerEmail);
        await page.locator("#login-password").fill(state.testPassword);
        await page.locator('button[type="submit"]').click();

        await page.waitForURL(`**/offers/${state.claimOfferSlug}`, { timeout: 15_000 });
        await expect(
            page.getByRole("button", { name: "Get this deal" }).or(page.getByText("Your claimed voucher")),
        ).toBeVisible({ timeout: 10_000 });
    });
});
