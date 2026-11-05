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

// The cookie table is the thing a complaint would check first, so it has to
// name the cookies we actually set. It reads them from the same constant
// the site does, rather than a name typed out once and left behind.
test("the cookie policy names the cookies Analytics actually sets", async ({ page }) => {
    await page.goto("/legal/cookies");

    const table = page.locator("main table");
    await expect(table.getByText("_ga", { exact: true })).toBeVisible();
    await expect(table.getByText(/^_ga_[A-Z0-9]+$/)).toBeVisible();

    // The name from a property we don't report to.
    await expect(page.locator("main")).not.toContainText("_ga_2W27LXHDWE");

    // And it says what the consent cookie holds, which is the record of the
    // choice: what, when, and which policy.
    await expect(page.locator("main")).toContainText("promotello_consent");
    await expect(page.locator("main")).toContainText("the day you chose");
});
