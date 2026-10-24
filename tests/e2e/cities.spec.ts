import { test, expect } from "@playwright/test";

test("the home page and old listing links go to the visitor's city", async ({ page, request }) => {
    const home = await request.get("/", { maxRedirects: 0 });
    expect(home.status()).toBe(307);
    expect(home.headers()["location"]).toBe("/bristol");

    const old = await request.get("/offers?category=food-drink&sort=popular", { maxRedirects: 0 });
    expect(old.headers()["location"]).toBe("/bristol/offers?category=food-drink&sort=popular");

    const category = await request.get("/categories/shopping", { maxRedirects: 0 });
    expect(category.headers()["location"]).toBe("/bristol/categories/shopping");

    await page.goto("/bristol/offers");
    await expect(page.getByRole("heading", { name: "Offers across Bristol" })).toBeVisible();

    await page.goto("/bristol/businesses");
    await expect(page.getByRole("heading", { name: "Bristol's independents" })).toBeVisible();
});

test("cities that aren't live don't have pages", async ({ request }) => {
    const response = await request.get("/atlantis/offers");
    expect(response.status()).toBe(404);
});

test("businesses outside a live city can join the waitlist", async ({ page }) => {
    await page.goto("/business/waitlist");
    await page.locator("#name").fill("E2E Waitlister");
    await page.locator("#email").fill(`e2e-waitlist-${Date.now()}@test.internal`);
    await page.locator("#town").fill("E2E Town");
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.getByText("You're on the list")).toBeVisible({ timeout: 10_000 });
});
