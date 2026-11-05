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

test("on a phone, the customer area carries a row of pills for its pages", async ({ browser }) => {
    const page = await (
        await browser.newContext({ storageState: CUSTOMER_AUTH, viewport: { width: 390, height: 844 } })
    ).newPage();

    await page.goto("/dashboard");
    const pills = page.getByRole("navigation", { name: "Your account pages" });
    await expect(pills.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

    await pills.getByRole("link", { name: "My vouchers" }).click();
    await page.waitForURL("**/dashboard/redemptions");

    // Only the page you're on, even though everything is under /dashboard.
    await expect(pills.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(pills.getByRole("link", { name: "My vouchers" })).toHaveAttribute("aria-current", "page");

    // Off the right of a narrow screen, so it is scrolled into view.
    const box = (await pills.getByRole("link", { name: "My vouchers" }).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
});

test("on a desktop the row is left to the account menu", async ({ browser }) => {
    const page = await (
        await browser.newContext({ storageState: CUSTOMER_AUTH, viewport: { width: 1280, height: 900 } })
    ).newPage();

    await page.goto("/dashboard");
    await expect(page.getByRole("navigation", { name: "Your account pages" })).toBeHidden();
});
