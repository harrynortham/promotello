import { test, expect } from "@playwright/test";
import { CUSTOMER_AUTH } from "../global-setup";

test.use({ viewport: { width: 390, height: 844 } });

test("on a phone, the menu opens as a sheet and closes after choosing a page", async ({ page }) => {
    await page.goto("/");

    // The inline navigation is hidden on small screens.
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();

    await menu.getByRole("link", { name: "Offers", exact: true }).click();
    await page.waitForURL("**/offers");
    await expect(page.getByRole("dialog")).toBeHidden();
});

// The line at the bottom of the menu is for whoever the header isn't built
// for: a business owner on the customer side, or — once you're signed in —
// your own pages, which nothing but the avatar leads to.
test("the bottom of the menu offers the pitch to businesses, or your dashboard", async ({ page, browser }) => {
    await page.goto("/offers");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: /Put your offers on Promotello/ })).toBeVisible();

    const signedIn = await (
        await browser.newContext({ storageState: CUSTOMER_AUTH, viewport: { width: 390, height: 844 } })
    ).newPage();

    await signedIn.goto("/offers");
    await signedIn.getByRole("button", { name: "Open menu" }).click();
    await expect(signedIn.getByRole("link", { name: "Go to your dashboard" })).toBeVisible();
    await expect(signedIn.getByRole("link", { name: /Put your offers on Promotello/ })).toHaveCount(0);

    await signedIn.getByRole("link", { name: "Go to your dashboard" }).click();
    await signedIn.waitForURL("**/dashboard");
    await expect(signedIn.getByRole("dialog")).toBeHidden();

    // Nothing pointing at the page you're already on...
    await signedIn.getByRole("button", { name: "Open menu" }).click();
    await expect(signedIn.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(signedIn.getByRole("link", { name: "Go to your dashboard" })).toHaveCount(0);

    // ...but still there from the rest of the customer area.
    await signedIn.goto("/dashboard/redemptions");
    await signedIn.getByRole("button", { name: "Open menu" }).click();
    await expect(signedIn.getByRole("link", { name: "Go to your dashboard" })).toBeVisible();
});
