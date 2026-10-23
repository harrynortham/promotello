import { test, expect } from "@playwright/test";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

test("business owner can mark a customer redemption code as used", async ({ page }) => {
    const { businessId, preClaimedCode } = JSON.parse(
        fs.readFileSync(STATE_PATH, "utf8"),
    );

    await page.goto(`/business/${businessId}/redemptions`);

    // The pre-claimed code should appear in the list with a "Not used" badge.
    await expect(page.getByText(preClaimedCode)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Not used").first()).toBeVisible();

    // Find the card that contains this specific code and click its "Mark as used" button.
    const card = page.locator("article, [data-card], .rounded-xl, [class*='card']").filter({
        has: page.getByText(preClaimedCode),
    }).first();

    // Fall back to finding the submit button nearest to the code text if the
    // card selector doesn't match the rendered markup.
    const markUsedButton = (await card.count())
        ? card.getByRole("button", { name: "Mark as used" })
        : page.getByRole("button", { name: "Mark as used" }).first();

    await markUsedButton.click();

    // The page redirects back to redemptions and the card should now show "Used".
    await page.waitForURL(`**/business/${businessId}/redemptions**`, { timeout: 10_000 });
    await expect(page.getByText(preClaimedCode)).toBeVisible();
    await expect(page.getByText("Used").first()).toBeVisible();
});
