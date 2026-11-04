import { test, expect } from "@playwright/test";

test("the home page stays at / and has a location search", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/");

    const location = page.getByRole("combobox", { name: "Location" });
    await location.fill("Clif");
    await expect(page.getByRole("option", { name: /Clifton/ })).toBeVisible();
    await location.press("Enter");
    await page.waitForURL("**/explore/bristol/clifton");
    await expect(page.getByRole("heading", { name: "Clifton, Bristol", level: 1 })).toBeVisible();
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

// Locally there are no Vercel location headers, so these tests send their
// own (on Vercel, the platform sets them from the visitor's IP address).
const bristol = { "x-vercel-ip-latitude": "51.4600", "x-vercel-ip-longitude": "-2.6000", "x-vercel-ip-city": "Bristol", "x-vercel-ip-country": "GB" };
// Somewhere Promotello will not be launching, so this stays true however many
// cities go live. London would not: it is a plausible future city, and the
// test would then be checking the wrong thing.
const faraway = { "x-vercel-ip-latitude": "57.4778", "x-vercel-ip-longitude": "-4.2247", "x-vercel-ip-city": "Inverness", "x-vercel-ip-country": "GB" };

test.describe("a visitor in Bristol", () => {
    test.use({ extraHTTPHeaders: bristol });

    test("sees Bristol, and can switch to every location", async ({ page }) => {
        await page.goto("/offers");
        await expect(page.getByRole("heading", { name: "Offers across Bristol" })).toBeVisible();
        await expect(page.getByRole("combobox", { name: "Location" })).toHaveAttribute("placeholder", "Bristol");
        await expect(page.getByText(/isn.t in .* yet/)).toHaveCount(0);

        await page.getByRole("button", { name: "Show all locations" }).click();
        await page.waitForURL(/\/offers$/);
        await expect(page.getByRole("button", { name: "Show all locations" })).toHaveCount(0);

        // The choice is remembered on other pages.
        await page.goto("/");
        await expect(page.getByRole("button", { name: "Show all locations" })).toHaveCount(0);
    });
});

test.describe("a visitor somewhere we aren't", () => {
    test.use({ extraHTTPHeaders: faraway });

    test("is shown the live city, and told nothing about where they are", async ({ page }) => {
        for (const path of ["/", "/offers", "/explore"]) {
            await page.goto(path);

            // Nothing guesses at their location out loud. The town only ever
            // comes from the address the request arrived on, which on a
            // mobile network is the carrier's gateway and can name a town at
            // the other end of the country.
            await expect(page.getByRole("complementary"), path).toHaveCount(0);
            await expect(page.locator("body"), path).not.toContainText("Inverness");
            await expect(page.locator("body"), path).not.toContainText("isn't in");
        }
    });

    test("can pick a city for themselves, and it is remembered", async ({ page }) => {
        await page.goto("/explore");

        await page.getByRole("combobox", { name: "Location" }).fill("Bristol");
        await page.getByRole("option", { name: /Bristol\s*City/ }).click();
        await page.waitForURL("**/explore/bristol");

        await page.goto("/offers");
        await expect(page.getByRole("combobox", { name: "Location" })).toHaveAttribute("placeholder", "Bristol");
    });
});

test.describe("picking a place on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    const panel = "[role=dialog]";
    const rect = (page: import("@playwright/test").Page) =>
        page.evaluate((css) => {
            const r = document.querySelector(css)!.getBoundingClientRect();
            return { top: Math.round(r.y), h: Math.round(r.height), vh: innerHeight };
        }, panel);

    for (const path of ["/", "/explore"]) {
        test(`the choices open in a panel on ${path}, clear of the keyboard`, async ({ page }) => {
            await page.goto(path);
            await page.getByRole("button", { name: "Location" }).first().click();
            await expect(page.locator(panel)).toBeVisible();
            await page.waitForTimeout(600);

            const before = await rect(page);
            // Pinned near the top: iOS draws the keyboard over the bottom of
            // the screen rather than pushing anything up, so anything low
            // down can be swallowed by it.
            expect(before.top, "pinned near the top of the screen").toBeLessThan(40);

            // It used to hang off the field and be re-measured on every
            // scroll and resize, so it changed height as the page moved and
            // flipped sides when the keyboard opened.
            await page.mouse.wheel(0, 240);
            await page.waitForTimeout(300);

            const after = await rect(page);
            expect(after.h, "the panel shouldn't move when the page behind it does").toBe(before.h);
            expect(after.top).toBe(before.top);
        });
    }

    test("opens without summoning the keyboard, and lists everywhere you can go", async ({ page }) => {
        await page.goto("/explore");
        await page.getByRole("button", { name: "Location" }).first().click();
        await expect(page.locator(panel)).toBeVisible();

        // iOS keeps position:fixed pinned to the layout viewport, so a
        // keyboard draws over the bottom of the screen instead of pushing
        // anything up. Nothing should ask for one uninvited.
        const search = page.getByRole("combobox", { name: "Search locations" });
        await expect(search).not.toBeFocused();

        // And there should be no need to type: the neighbourhoods are listed,
        // not hidden behind a search.
        await expect(page.getByRole("option", { name: /Clifton/ })).toBeVisible();
        expect(await page.getByRole("option").count(), "every place is listed").toBeGreaterThan(10);

        // If someone does tap the box, it has to stay above a keyboard.
        const room = await page.evaluate(() => {
            const i = document.querySelector("[aria-label='Search locations']")!.getBoundingClientRect();
            return { inputBottom: Math.round(i.bottom), vh: window.innerHeight };
        });
        expect(room.inputBottom, "the search box sits above where a keyboard would be").toBeLessThan(room.vh - 320);
    });

    test("typing narrows the list, and choosing goes there", async ({ page }) => {
        await page.goto("/explore");
        await page.getByRole("button", { name: "Location" }).first().click();
        await expect(page.locator(panel)).toBeVisible();

        await page.getByRole("combobox", { name: "Search locations" }).fill("clif");
        await expect(page.getByRole("option", { name: /Clifton/ })).toBeVisible();

        await page.getByRole("option", { name: /Clifton/ }).click();
        await page.waitForURL("**/explore/bristol/clifton");
        await expect(page.getByRole("heading", { name: "Clifton, Bristol", level: 1 })).toBeVisible();
    });
});
