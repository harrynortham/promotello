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
