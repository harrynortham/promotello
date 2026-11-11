import { test, expect } from "@playwright/test";
import { BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

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

// The line at the bottom of the menu is for whoever the header isn't built
// for: a business owner on the customer side, or — once you're signed in —
// your own pages, which nothing but the avatar leads to.
test("the bottom of the menu offers the pitch to businesses, or your dashboard", async ({ page, browser }) => {
    await page.goto("/offers");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: /Put your offers on Promotello/ })).toBeVisible();

    const signedIn = await (
        await browser.newContext({ storageState: CUSTOMER_AUTH, viewport: { width: 390, height: 844 } })
    ).newPage();

    await signedIn.goto("/offers");
    await signedIn.getByRole("button", { name: "Open menu" }).click();
    await expect(signedIn.getByRole("link", { name: "Go to your dashboard" })).toBeVisible();
    await expect(signedIn.getByRole("link", { name: /Put your offers on Promotello/ })).toHaveCount(0);

    await signedIn.getByRole("link", { name: "Go to your dashboard" }).click();
    await signedIn.waitForURL("**/dashboard");
    await expect(signedIn.getByRole("dialog")).toBeHidden();

    // Nothing pointing at the page you're already on...
    await signedIn.getByRole("button", { name: "Open menu" }).click();
    await expect(signedIn.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(signedIn.getByRole("link", { name: "Go to your dashboard" })).toHaveCount(0);

    // ...but still there from the rest of the customer area.
    await signedIn.goto("/dashboard/redemptions");
    await signedIn.getByRole("button", { name: "Open menu" }).click();
    await expect(signedIn.getByRole("link", { name: "Go to your dashboard" })).toBeVisible();
});

// The business sales pages have no way back to the dashboard: the links
// across the top are the pitch, and the avatar is the only thing that
// leads anywhere of yours. So the bottom of the menu says it.
test("signed in, the business menu leads back to the dashboard", async ({ page, browser }) => {
    await page.goto("/business/pricing");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: "Go to your business dashboard" })).toHaveCount(0);
    // Base UI renders these as <a role="button">, so not getByRole("link").
    await expect(page.getByRole("button", { name: /Already registered/ })).toBeVisible();

    const owner = await (
        await browser.newContext({ storageState: BUSINESS_AUTH, viewport: { width: 390, height: 844 } })
    ).newPage();

    await owner.goto("/business/pricing");
    // Not /menu/i: signed in, that also matches "Open account menu for …".
    await owner.getByRole("button", { name: "Open menu" }).click();

    const dashboard = owner.getByRole("link", { name: "Go to your business dashboard" });
    await expect(dashboard).toBeVisible();
    await expect(owner.getByText("Your offers, posters and stamp cards")).toBeVisible();

    await dashboard.click();
    // One business goes straight to it, several to the chooser; either way
    // it leaves the sales pages behind.
    await owner.waitForURL((url) => !url.pathname.startsWith("/business/pricing"), { timeout: 20_000 });
    await expect(owner.getByRole("dialog")).toBeHidden();

    // A customer reading the same page has no dashboard behind that line,
    // so it isn't offered — they would land on "let's set up your
    // business", which is not what "yours" promised.
    const customer = await (
        await browser.newContext({ storageState: CUSTOMER_AUTH, viewport: { width: 390, height: 844 } })
    ).newPage();

    await customer.goto("/business/pricing");
    await customer.getByRole("button", { name: "Open menu" }).click();
    // Given a moment, in case the check is still in flight.
    await customer.waitForTimeout(1_500);
    await expect(customer.getByRole("link", { name: "Go to your business dashboard" })).toHaveCount(0);

    await owner.close();
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

// The navigation is centred in the header and the account button sits at
// the right, so the two can run into each other at the widths in between —
// they did, between the menu button disappearing and the window being wide
// enough for a name and an email beside four links.
test("the navigation and the account button never run into each other", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    for (const width of [700, 768, 820, 900, 1000, 1024, 1100, 1280, 1536]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/dashboard");

        const edges = await page.evaluate(() => {
            const onScreen = (el: Element | null) => {
                if (!el) return null;
                const box = el.getBoundingClientRect();
                return getComputedStyle(el).display === "none" || box.width === 0
                    ? null
                    : { left: box.left, right: box.right };
            };

            return {
                nav: onScreen(document.querySelector('nav[aria-label="Primary navigation"]')),
                account: onScreen(document.querySelector('[aria-label^="Open account menu"]')),
            };
        });

        if (edges.nav && edges.account) {
            expect(edges.nav.right, `at ${width}px`).toBeLessThanOrEqual(edges.account.left);
        }
    }
});

// The close is the twin of the button that opened the menu: same size,
// and on the same line as the logo rather than floating above it.
test("the menu's close button lines up with the logo", async ({ page }) => {
    await page.goto("/offers");
    await page.getByRole("button", { name: "Open menu" }).click();

    const lined = await page.evaluate(() => {
        const middle = (el: Element | null) => {
            if (!el) return null;
            const box = el.getBoundingClientRect();
            return { centre: box.top + box.height / 2, size: box.height };
        };

        return {
            close: middle(document.querySelector('[data-slot="sheet-header"] [data-slot="sheet-close"]')),
            logo: middle(document.querySelector('[data-slot="sheet-header"] img')),
        };
    });

    expect(lined.close, "the close is in the header, not floating over it").toBeTruthy();
    expect(Math.abs(lined.close!.centre - lined.logo!.centre), "on the logo's line").toBeLessThanOrEqual(2);
    expect(lined.close!.size, "big enough to hit").toBeGreaterThanOrEqual(40);

    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
});

// The business marketing header carries the same drawn icons the
// customer one does, on the desktop row and inside the sheet.
test("the business header links carry their icons too", async ({ page }) => {
    const labels = ["How it works", "Features", "Pricing", "Demo", "Blog"];

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/business");

    const header = page.locator("header").filter({ has: page.getByRole("link", { name: "Pricing" }) }).first();

    for (const label of labels) {
        const link = header.getByRole("link", { name: label });
        await expect(link.locator('svg[viewBox="0 0 32 32"]'), label).toHaveCount(1);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/business");
    await page.getByRole("button", { name: /menu/i }).first().click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    for (const label of labels) {
        await expect(
            sheet.getByRole("link", { name: label }).locator('svg[viewBox="0 0 32 32"]'),
            label,
        ).toHaveCount(1);
    }
});
