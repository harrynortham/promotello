import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("on a phone, the menu opens as a sheet and closes after choosing a page", async ({ page }) => {
    await page.goto("/");

    // The inline navigation is hidden on small screens.
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();

    await menu.getByRole("link", { name: "Offers" }).click();
    await page.waitForURL("**/offers");
    await expect(page.getByRole("dialog")).toBeHidden();
});
