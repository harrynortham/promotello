import { test, expect } from "@playwright/test";

import { PAGE_SIZE } from "@/lib/listing-filters";

// A listing shows a screenful at a time, and each press of Show more adds
// another below it. The URL carries how much is showing, so the server
// renders it: it works without JavaScript, the back button goes back to
// what you were looking at, and a shared link opens the same list.

// Next keeps the previous page's tree around hidden through a transition,
// so count what is actually on screen.
function cardsOn(page: import("@playwright/test").Page, slot: "offer-card" | "business-card") {
    return page.evaluate((which) =>
        [...document.querySelectorAll("main")]
            .filter((main) => getComputedStyle(main).display !== "none")
            .reduce((count, main) => count + main.querySelectorAll(`[data-slot="${which}"]`).length, 0), slot);
}

test("offers come a screenful at a time, and Show more adds to them", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/offers");

    const foot = page.getByText(/Showing \d+ of \d+ offers/);
    await expect(foot).toHaveText(new RegExp(`Showing ${PAGE_SIZE} of \\d+ offers`));
    // Polled: the grid streams in, so a count read once can be read early.
    await expect.poll(() => cardsOn(page, "offer-card")).toBe(PAGE_SIZE);

    const more = page.getByRole("link", { name: /Show more offers/ });
    await more.scrollIntoViewIfNeeded();
    const where = await page.evaluate(() => window.scrollY);

    await more.click();
    await page.waitForURL(new RegExp(`show=${PAGE_SIZE * 2}`));

    // The ones already read stay where they were, and more follow them.
    await expect(foot).not.toHaveText(new RegExp(`Showing ${PAGE_SIZE} of`));
    await expect.poll(() => cardsOn(page, "offer-card")).toBeGreaterThan(PAGE_SIZE);
    expect(await page.evaluate(() => window.scrollY)).toBe(where);

    // Back goes to the screenful you were on, not to the top of the site.
    await page.goBack();
    await expect(foot).toHaveText(new RegExp(`Showing ${PAGE_SIZE} of \\d+ offers`));
});

test("choosing a filter starts the list again", async ({ page }) => {
    await page.goto(`/offers?show=${PAGE_SIZE * 2}`);
    await page.getByText(/Showing \d+ of \d+ offers/).waitFor();

    const hrefs = await page
        .locator("main a[href*='category=']")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));

    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.filter((href) => href.includes("show="))).toEqual([]);
});

test("a nonsense ?show= still shows the first screenful", async ({ page }) => {
    await page.goto("/offers?show=all-of-them");
    await expect(page.getByText(/Showing \d+ of \d+ offers/)).toHaveText(
        new RegExp(`Showing ${PAGE_SIZE} of \\d+ offers`),
    );
});

test("a listing that fits on one screen says nothing about paging", async ({ page }) => {
    await page.goto("/businesses");
    await expect(page.locator('main [data-slot="business-card"]').first()).toBeVisible();

    const total = await cardsOn(page, "business-card");
    test.skip(total > PAGE_SIZE, "more businesses than a screenful now; the foot belongs here");

    await expect(page.getByText(/Showing \d+ of \d+ businesses/)).toHaveCount(0);
});
