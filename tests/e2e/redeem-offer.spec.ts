import { test, expect } from "@playwright/test";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

// The till page: find the code somebody is holding, check what the offer
// actually is, and mark it used once — with a question in between,
// because it can't be undone.
test("a code is found, checked, and marked used once", async ({ page }) => {
    const { businessId, preClaimedCode } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/redemptions`);

    // Searching for a code that isn't theirs says so rather than showing
    // an empty list.
    await page.locator("#code").fill("ZZZZZZZZZZ");
    await page.getByRole("button", { name: "Find" }).click();
    await expect(page.getByText(/No voucher of yours has the code ZZZZZZZZZZ/)).toBeVisible({ timeout: 15_000 });

    await page.locator("#code").fill(preClaimedCode);
    await page.getByRole("button", { name: "Find" }).click();
    await expect(page.getByText(preClaimedCode).first()).toBeVisible({ timeout: 15_000 });

    // What the offer covers, for the owner who has forgotten it.
    await page.getByRole("button", { name: "Offer details" }).first().click();
    await expect(page.getByText("A test offer for the redeem flow.")).toBeVisible();
    await expect(page.getByText("For automated tests only.")).toBeVisible();

    // Marking it used asks first, and names what is being given away.
    await page.getByRole("button", { name: "Mark as used" }).first().click();

    const confirm = page.getByRole("dialog");
    await expect(confirm.getByText("Mark this voucher as used?")).toBeVisible();
    await expect(confirm.getByText(preClaimedCode)).toBeVisible();
    await expect(confirm.getByText(/can.t be undone/)).toBeVisible();

    await confirm.getByRole("button", { name: "Yes, mark it used" }).click();

    // And says so when it comes back.
    await expect(page.getByText(`Voucher ${preClaimedCode} is used`)).toBeVisible({ timeout: 20_000 });

    // It has moved out of "to use" and into "used".
    await page.goto(`/business/${businessId}/redemptions?show=used`);
    await expect(page.getByText(preClaimedCode).first()).toBeVisible({ timeout: 15_000 });
    await expect(
        page.locator("li").filter({ hasText: preClaimedCode }).getByRole("button", { name: "Mark as used" }),
    ).toHaveCount(0);
});
