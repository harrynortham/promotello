import { test, expect } from "@playwright/test";

test("the home page stays at / and has a location search", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/");

    const location = page.getByRole("combobox", { name: "Location" });
    await location.fill("Clif");
    await expect(page.getByRole("option", { name: /Clifton/ })).toBeVisible();
    await location.press("Enter");
    await page.waitForURL("**/explore/bristol?area=Clifton");
    await expect(page.getByRole("heading", { name: /Find your next favourite place/ })).toBeVisible();
});

test("listing pages show every city by default, and one city when added to the URL", async ({ page }) => {
    for (const path of ["/offers", "/businesses", "/explore", "/categories/food-drink"]) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        expect(new URL(page.url()).pathname, path).toBe(path);
    }

    await page.goto("/offers/bristol");
    await expect(page.getByRole("heading", { name: "Offers across Bristol" })).toBeVisible();

    await page.goto("/businesses/bristol");
    await expect(page.getByRole("heading", { name: "Bristol's independents" })).toBeVisible();

    await page.goto("/categories/food-drink/bristol");
    await expect(page).toHaveTitle(/Food & drink offers in Bristol/);

    // Choosing a location on a listing keeps you on that kind of page.
    await page.goto("/offers");
    await page.getByRole("combobox", { name: "Location" }).fill("Bristol");
    await page.getByRole("option", { name: /Bristol\s*City/ }).click();
    await page.waitForURL("**/offers/bristol");
});

test("cities that aren't live don't have pages", async ({ page }) => {
    await page.goto("/explore/atlantis");
    await expect(page.getByRole("heading", { name: /wasn.t the discovery you had in mind/ })).toBeVisible();
});

test("businesses outside a live city can join the waitlist", async ({ page }) => {
    await page.goto("/business/waitlist");
    await page.locator("#name").fill("E2E Waitlister");
    await page.locator("#email").fill(`e2e-waitlist-${Date.now()}@test.internal`);
    await page.locator("#town").fill("E2E Town");
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.getByText("You're on the list")).toBeVisible({ timeout: 10_000 });
});
