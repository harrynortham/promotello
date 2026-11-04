import { test, expect, type Page } from "@playwright/test";

// What has to stay true once Promotello is live in more than one place.
//
// These only run when two or more cities are live, so they sit quiet on a
// one-city database and have something to say the moment a second city is
// added. To run them deliberately:
//
//   node --env-file=.env.local scripts/sample-data.mjs seed-city bath
//   npx playwright test tests/e2e/multi-city.spec.ts
//   node --env-file=.env.local scripts/sample-data.mjs remove-city bath
//
// docs/MULTI-CITY.md explains the rules they are checking.

// The live cities, read from the location search rather than the database,
// so the test sees what a visitor sees.
async function liveCities(page: Page) {
    await page.goto("/offers");
    await page.getByRole("combobox", { name: "Location" }).first().click();
    await expect(page.getByRole("option").first()).toBeVisible();

    // Each option is "<label>\n<detail>"; a city's detail is exactly "City",
    // which keeps "Use my location" and the neighbourhoods out.
    const options = await page.getByRole("option").allInnerTexts();

    return options
        .map((text) => text.split("\n").map((line) => line.trim()))
        .filter((parts) => parts[1] === "City")
        .map((parts) => parts[0]);
}

// Picks a city in the location search and waits for its page.
async function chooseCity(page: Page, name: string, base = "/offers") {
    await page.goto(base);
    await page.getByRole("combobox", { name: "Location" }).first().fill(name);
    await page.getByRole("option", { name: new RegExp(`^${name}\\s*City$`) }).click();
    await page.waitForURL(new RegExp(`${base}/[a-z-]+$`));
}

test.describe("with more than one city live", () => {
    let cities: string[] = [];

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        cities = await liveCities(page);
        await page.close();
    });

    test.beforeEach(() => {
        test.skip(cities.length < 2, `only ${cities.length} city live; seed a second one to run these`);
    });

    test("the listing pages name the places instead of saying 'your area'", async ({ page }) => {
        for (const path of ["/", "/offers", "/businesses", "/explore", "/categories"]) {
            await page.goto(path);
            await expect(page.locator("body"), path).not.toContainText("your area");
            await expect(page, path).not.toHaveTitle(/your area/);
        }
    });

    test("every city is reachable, and its own pages say which city they are", async ({ page }) => {
        for (const name of cities) {
            await chooseCity(page, name);

            await expect(page.getByRole("heading", { name: `Offers across ${name}` })).toBeVisible();
            await expect(page).toHaveTitle(new RegExp(`Offers in ${name}`));
        }
    });

    test("looking at every city, the filter offers cities; inside one, it offers areas", async ({ page }) => {
        // With nothing chosen and no location headers, /offers is every city.
        await page.goto("/offers");

        await page.getByRole("button", { name: "Filter" }).click();
        await expect(page.getByRole("dialog").getByText("Location", { exact: true })).toBeVisible();
        await expect(page.getByRole("dialog").getByText("Area", { exact: true })).toHaveCount(0);

        // Areas belong to a city, so they only appear once one is chosen.
        await page.getByRole("dialog").getByRole("link", { name: cities[0], exact: true }).click();
        await page.waitForURL(/\/offers\/[a-z-]+$/);
        await page.getByRole("button", { name: "Filter" }).click();
        await expect(page.getByRole("dialog").getByText("Area", { exact: true })).toBeVisible();
    });

    test("a neighbourhood is always shown with the city it is in", async ({ page }) => {
        await page.goto("/explore");

        const chips = page.locator("main a[href^='/explore/']").filter({ hasText: /\S/ });
        await expect(chips.first()).toBeVisible();

        const labels = (await chips.allInnerTexts())
            .map((text) => text.replace(/\s+/g, " ").trim())
            .filter((text) => text && !text.startsWith("Explore "));

        const unlabelled = labels.filter((text) => !cities.some((city) => text.includes(city)));

        expect(unlabelled, "neighbourhoods shown without naming their city").toEqual([]);
    });

    test("a neighbourhood link opens that city's page, not another city's", async ({ page }) => {
        await page.goto("/explore");

        const chip = page.locator("main a[href^='/explore/'][href*='/'] >> nth=0");
        const href = await chip.getAttribute("href");
        const [, , citySlug] = (href ?? "").split("/");
        const expected = cities.find((name) => name.toLowerCase().replace(/\s+/g, "-") === citySlug);

        expect(expected, `${href} should belong to a live city`).toBeTruthy();

        await chip.click();
        await page.waitForURL(new RegExp(`/explore/${citySlug}/`));
        await expect(page.getByRole("heading", { level: 1 })).toContainText(expected!);
    });

    test("a link to an area goes to the city that has it, whatever city is remembered", async ({ page }) => {
        // Pick an area belonging to a city other than the one we'll remember.
        await page.goto("/explore");

        // The listing streams in, and count() doesn't wait for it.
        await expect(page.locator("main a[href^='/explore/']").first()).toBeVisible();

        const wanted = cities[1].toLowerCase().replace(/\s+/g, "-");
        const chip = page.locator(`main a[href^='/explore/${wanted}/']`).filter({ hasText: /\S/ }).first();

        test.skip((await chip.count()) === 0, `no neighbourhoods in ${cities[1]}`);

        const area = (await chip.innerText()).split("\n")[0].trim();

        // Remember the other city, then follow a link that names only an area.
        await chooseCity(page, cities[0], "/businesses");
        await page.goto(`/businesses?area=${encodeURIComponent(area)}`);

        await expect(page).toHaveURL(new RegExp(`/businesses/${wanted}\\?area=`));
        await expect(page.getByRole("heading", { level: 1 })).toContainText(cities[1]);
    });

    test("searching for a city's name finds that city's offers", async ({ page }) => {
        let found = 0;

        for (const name of cities) {
            await page.goto(`/offers?search=${encodeURIComponent(name)}`);

            // A city can be live before its first business, so an empty
            // result is allowed — but anything it does return is its own.
            if (await page.getByText("No offers match").count()) continue;

            const cards = await page.locator("article").allInnerTexts();
            const strangers = cards.filter((text) => !text.includes(name));

            expect(strangers, `searching ${name} returned other cities' offers`).toEqual([]);
            found += 1;
        }

        expect(found, "no city's name matched anything").toBeGreaterThan(0);
    });

    test("the category counts are for the city being shown", async ({ page }) => {
        const counts: Record<string, string[]> = {};

        for (const name of cities) {
            await chooseCity(page, name);
            await page.goto("/categories");
            counts[name] = await page.locator("article span").filter({ hasText: /^\d+ offers?$/ }).allInnerTexts();
        }

        // Two cities with different businesses can't have identical counts;
        // identical ones mean the page is ignoring the city.
        const [first, second] = cities;
        expect(counts[first].join(), `${first} and ${second} showed the same counts`).not.toEqual(counts[second].join());
    });

    test("a city chosen from a city page survives the header links", async ({ page }) => {
        const slug = cities[1].toLowerCase().replace(/\s+/g, "-");

        await page.goto(`/offers/${slug}`);
        await expect(page.getByRole("heading", { name: `Offers across ${cities[1]}` })).toBeVisible();

        await page.getByRole("banner").getByRole("link", { name: "Businesses", exact: true }).click();
        await page.waitForURL(/\/businesses$/);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(cities[1]);
    });

    test("a visitor we can't place gets a heading that doesn't pretend to be a place", async ({ page }) => {
        await page.goto("/offers");

        // Nothing is shown about where they might be — the town the address
        // resolves to is too often wrong to put on the page.
        await expect(page.getByRole("complementary")).toHaveCount(0);

        // And a list of cities is not a place, so the heading names none.
        const heading = await page.getByRole("heading", { level: 1 }).innerText();
        expect(cities.some((name) => heading.includes(name)), heading).toBe(false);
    });

    test("the location search is the way to a city, and it is remembered", async ({ page }) => {
        await chooseCity(page, cities[1]);
        await expect(page.getByRole("heading", { name: `Offers across ${cities[1]}` })).toBeVisible();

        // The header links are the same on every page, so the city has to
        // survive them.
        await page.getByRole("banner").getByRole("link", { name: "Businesses", exact: true }).click();
        await page.waitForURL(/\/businesses$/);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(cities[1]);
    });

    test("a list spanning cities isn't filled by whichever joined last", async ({ page }) => {
        await page.goto("/offers");

        const cards = await page.locator("article").allInnerTexts();
        const shown = cards
            .slice(0, 6)
            .map((text) => cities.find((name) => text.includes(name)))
            .filter(Boolean);

        expect(shown.length, "cards should name their city").toBeGreaterThan(3);
        expect(new Set(shown).size, `first cards were all from ${shown[0]}`).toBeGreaterThan(1);
    });
});
