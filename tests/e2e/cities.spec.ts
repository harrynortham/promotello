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

    test("is told we're not there yet, and can correct the town before asking to hear", async ({ page }) => {
        await page.goto("/");
        const banner = page.getByRole("complementary", { name: "Promotello near you" });
        // Which places are named depends on how many are live, so the test
        // checks that it names them at all: "your area" was what it said
        // before, and it told a visitor nothing.
        await expect(banner).toContainText("Promotello isn't in Inverness yet");
        await expect(banner).not.toContainText("your area");

        // The town is only a guess from the address the request came in on.
        // On a mobile network that is the carrier's gateway, which can be the
        // other end of the country, so it has to be correctable — otherwise
        // the waitlist fills up with the wrong towns.
        const town = banner.getByRole("textbox", { name: "Your town" });
        await expect(town).toHaveValue("Inverness");
        await town.fill("Gibraltar");

        await banner.getByRole("textbox", { name: "Email address" }).fill(`e2e-interest-${Date.now()}@test.internal`);
        await banner.getByRole("button", { name: "Tell me when" }).click();
        await expect(banner.getByText("We'll email you when Promotello comes to Gibraltar")).toBeVisible({ timeout: 10_000 });
    });

    test("can close the note, and it stays closed", async ({ page }) => {
        await page.goto("/offers");
        const banner = page.getByRole("complementary", { name: "Promotello near you" });

        await banner.getByRole("button", { name: "Close" }).click();
        await expect(banner).toHaveCount(0);

        await page.goto("/businesses");
        await expect(page.getByRole("complementary", { name: "Promotello near you" })).toHaveCount(0);
    });

    test("nothing is guessed about someone outside the UK", async ({ page }) => {
        // Vercel reports the country alongside the town; without a country we
        // cover, there is nothing worth telling them about their own location.
        await page.context().setExtraHTTPHeaders({
            "x-vercel-ip-latitude": "36.1408",
            "x-vercel-ip-longitude": "-5.3536",
            "x-vercel-ip-city": "Gibraltar",
            "x-vercel-ip-country": "GI",
        });
        await page.goto("/offers");

        await expect(page.getByRole("complementary", { name: "Promotello near you" })).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("can pick Bristol, which replaces the note", async ({ page }) => {
        await page.goto("/explore");
        await expect(page.getByText("Promotello isn't in Inverness yet")).toBeVisible();

        await page.getByRole("combobox", { name: "Location" }).fill("Bristol");
        await page.getByRole("option", { name: /Bristol\s*City/ }).click();
        await page.waitForURL("**/explore/bristol");

        await page.goto("/offers");
        await expect(page.getByText("Promotello isn't in Inverness yet")).toHaveCount(0);
        await expect(page.getByRole("combobox", { name: "Location" })).toHaveAttribute("placeholder", "Bristol");
    });
});
