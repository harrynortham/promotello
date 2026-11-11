import { test, expect } from "@playwright/test";
import { CUSTOMER_AUTH, BUSINESS_AUTH } from "../global-setup";

// The avatar menu is the same component for everybody, so the link to
// the business side has to ask whether there is one. Somebody who signed
// up to claim an offer has no business dashboard, and a link to one
// reads as a setup step they have missed.
test("a customer's account menu has no business dashboard in it", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Open account menu/ }).click();

    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "My vouchers" })).toBeVisible();

    // Given a moment to arrive, in case the check is still in flight.
    await expect(menu.getByRole("menuitem", { name: "Business dashboard" })).toHaveCount(0);
    await page.waitForTimeout(1_500);
    await expect(menu.getByRole("menuitem", { name: "Business dashboard" })).toHaveCount(0);
});

test("somebody who runs a business still gets the link", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Open account menu/ }).click();

    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Business dashboard" })).toBeVisible({
        timeout: 10_000,
    });
});
