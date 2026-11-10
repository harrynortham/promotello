import { test, expect } from "@playwright/test";

// The legal pages are finished documents: no template placeholders or
// draft notices (Google's sign-in review reads the privacy policy).

for (const path of ["/legal/privacy", "/legal/terms", "/legal/cookies", "/legal/refunds", "/legal/restricted-businesses"]) {
    test(`${path} has no placeholders`, async ({ page }) => {
        await page.goto(path);
        const text = await page.locator("main").innerText();

        expect(text).not.toMatch(/\[[A-Za-z][^\]]*\]/);
        expect(text).not.toContain("Draft template");
    });
}

test("the privacy policy explains Google sign-in", async ({ page }) => {
    await page.goto("/legal/privacy");

    await expect(page.getByRole("heading", { name: "Signing in with Google" })).toBeVisible();
    await expect(page.getByText(/Limited Use requirements/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Google API Services User Data Policy" })).toBeVisible();
});

// A business owner meets this page at the moments it matters: before they
// sign up, when they write an offer, and from the terms they agreed to.
test("the restricted businesses page is reachable from where it applies", async ({ page }) => {
    await page.goto("/legal/restricted-businesses");
    await expect(page.getByRole("heading", { name: "Restricted and prohibited businesses" })).toBeVisible();

    // It says what it can't list, what it lists with a licence, and which
    // offers it won't publish, and it points at Stripe's own list.
    for (const heading of [
        "Businesses we can't list",
        "Businesses we list once we've seen the paperwork",
        "Offers we won't publish, whatever the business",
    ]) {
        await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    await expect(
        page.getByRole("link", { name: "stripe.com/legal/restricted-businesses" }),
    ).toHaveAttribute("href", "https://stripe.com/legal/restricted-businesses");

    // From the terms.
    await page.goto("/legal/terms");
    await page.getByRole("link", { name: "restricted and prohibited businesses" }).click();
    await page.waitForURL("**/legal/restricted-businesses");

    // From the business sign-up page.
    await page.goto("/business/register");
    await expect(page.getByRole("link", { name: "restricted businesses" })).toHaveAttribute(
        "href",
        "/legal/restricted-businesses",
    );

    // And from the FAQ a business reads first, where the answer is folded
    // away until it is asked for.
    await page.goto("/business/faq");
    await page.getByText("Is there any business you can't list?").click();
    await expect(
        page.getByRole("link", { name: /Restricted and prohibited businesses/ }),
    ).toHaveAttribute("href", "/legal/restricted-businesses");
});

// The cookie table is the thing a complaint would check first, so it has
// to name the cookies we actually set — and now that Google Analytics is
// gone, that means naming none of its.
test("the cookie policy names only cookies we still set", async ({ page }) => {
    await page.goto("/legal/cookies");

    const main = page.locator("main");
    const table = page.locator("main table");

    await expect(table.getByText("sb-…-auth-token", { exact: true })).toBeVisible();
    await expect(table.getByText("promotello_city", { exact: true })).toBeVisible();

    // Gone with Analytics, and so is the record of the answer about it.
    await expect(main).not.toContainText("_ga");
    await expect(main).not.toContainText("promotello_consent");

    // And it says so rather than going quiet about it.
    await expect(main).toContainText("no banner");
});

// The site asks nothing because it sets nothing worth asking about. This
// is the claim both policies make, checked against the browser rather
// than taken from anybody's documentation.
//
// Essential: the Supabase sign-in cookies, and the city someone picks.
const ESSENTIAL = /^(sb-|promotello_city$)/;

test("no banner, and nothing on the visitor's device but essentials", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Offers", exact: true }).first().click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("region", { name: "Cookie choice" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Accept|Reject)$/ })).toHaveCount(0);

    const cookies = (await page.context().cookies()).map((cookie) => cookie.name);
    expect(cookies.filter((name) => !ESSENTIAL.test(name)), "cookies beyond the essential ones").toEqual([]);

    const stored = await page.evaluate(() => ({
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
    }));

    expect(stored, "nothing kept in the browser either").toEqual({ local: [], session: [] });
});

// Whoever answered the old banner still carries its cookies. They are
// cleared on the next visit rather than left for two years.
test("cookies from the old banner are deleted on the next visit", async ({ page, context }) => {
    await context.addCookies([
        { name: "_ga", value: "GA1.1.123.456", url: "http://localhost:3000" },
        { name: "_ga_J5SCQTSJTY", value: "GS1.1.123", url: "http://localhost:3000" },
        { name: "promotello_consent", value: "analytics|2026-11-05|1", url: "http://localhost:3000" },
    ]);

    await page.goto("/");

    await expect
        .poll(async () => (await context.cookies()).map((cookie) => cookie.name).filter((name) => /^_ga|^promotello_consent$/.test(name)))
        .toEqual([]);
});
