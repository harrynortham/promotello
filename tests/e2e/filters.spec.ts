import { test, expect } from "@playwright/test";

// The filter choices live behind one pill rather than rows of them. Where
// they open from depends on the room there is: up from the bottom on a
// phone, in from the side on a desktop, where the results can stay on screen
// beside them.

const panel = "[data-slot=drawer-popup]";

type Page = import("@playwright/test").Page;

async function openFilter(page: Page) {
    await page.goto("/businesses/bristol");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.locator(panel)).toBeVisible();
}

// The panel is position:fixed, so where it sits in the window is the
// question — and boundingBox() measures from the document, scroll included.
function rectOf(page: Page, selector: string) {
    return page.evaluate((css) => {
        const { x, y, width, height } = document.querySelector(css)!.getBoundingClientRect();
        return { x, y, width, height, vw: window.innerWidth, vh: window.innerHeight };
    }, selector);
}

// The panel slides in, so it is off the edge it comes from until the
// animation finishes. Waiting for it to stop moving is what makes the
// measurements below mean anything.
async function settled(page: Page) {
    await expect
        .poll(async () => {
            const first = await rectOf(page, panel);
            await page.waitForTimeout(100);
            const second = await rectOf(page, panel);
            return first.x === second.x && first.y === second.y;
        }, { message: "the drawer should stop moving" })
        .toBe(true);
}

// Somewhere Promotello isn't, so the visitor can't be placed in a live city.
const faraway = {
    "x-vercel-ip-latitude": "57.4778",
    "x-vercel-ip-longitude": "-4.2247",
    "x-vercel-ip-city": "Inverness",
    "x-vercel-ip-country": "GB",
};

test.describe("a visitor we can't place", () => {
    test.use({ extraHTTPHeaders: faraway });

    // With one city live, everything on the page is that city's whether or
    // not we worked out where the visitor is — so the neighbourhoods have to
    // be on offer either way. They weren't: the filter was hiding from
    // anyone outside Bristol while the page said "Bristol's independents".
    for (const path of ["/businesses", "/offers"]) {
        test(`still gets the neighbourhoods on ${path}`, async ({ page }) => {
            await page.goto(path);

            const heading = await page.getByRole("heading", { level: 1 }).innerText();
            test.skip(!heading.includes("Bristol"), "more than one city is live");

            await page.getByRole("button", { name: "Filter" }).click();
            const drawer = page.locator(panel);

            await expect(drawer.getByText("Area", { exact: true })).toBeVisible();
            await expect(drawer.getByRole("link", { name: "All of Bristol" })).toBeVisible();
            await expect(drawer.getByRole("link", { name: "Clifton" })).toBeVisible();
        });
    }

    test("and choosing one filters in place, without a detour", async ({ page }) => {
        await page.goto("/businesses");
        test.skip(!(await page.getByRole("heading", { level: 1 }).innerText()).includes("Bristol"), "more than one city is live");

        await page.getByRole("button", { name: "Filter" }).click();
        await page.locator(panel).getByRole("link", { name: "Clifton" }).click();
        await page.waitForURL(/area=Clifton/);

        // One city means there is no other city it could have meant, so no
        // redirect to /businesses/bristol on the way.
        expect(new URL(page.url()).pathname).toBe("/businesses");
        await expect(page.locator("main article").first()).toBeVisible();
    });
});

test.describe("on a desktop", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("the filter opens beside the results, not over them", async ({ page }) => {
        await openFilter(page);

        await settled(page);
        const box = await rectOf(page, panel);

        // Against the right edge, and full height.
        expect(Math.round(box.x + box.width), "flush with the right edge").toBe(box.vw);
        expect(Math.round(box.height), "full height").toBe(box.vh);
        expect(box.width, "a side panel, not the whole screen").toBeLessThan(box.vw / 2);

        // The results are still there to look at while choosing.
        const card = await rectOf(page, "main article");
        expect(card.x + card.width, "results aren't covered").toBeLessThan(box.x);
    });

    test("it can be closed, and choosing something filters and closes it", async ({ page }) => {
        await openFilter(page);
        await page.locator(panel).getByRole("button", { name: "Close" }).click();
        await expect(page.locator(panel)).toHaveCount(0);

        await openFilter(page);
        await page.keyboard.press("Escape");
        await expect(page.locator(panel)).toHaveCount(0);

        await openFilter(page);
        await page.locator(panel).getByRole("link", { name: "Clifton" }).click();
        await page.waitForURL(/area=Clifton/);
        await expect(page.locator(panel)).toHaveCount(0);

        // The pill says what's chosen, so the choice is visible once closed.
        await expect(page.getByRole("button", { name: "Clifton" })).toBeVisible();
    });
});

test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test("the filter still comes up from the bottom", async ({ page }) => {
        await openFilter(page);

        await settled(page);
        const box = await rectOf(page, panel);

        expect(Math.round(box.y + box.height), "sitting on the bottom edge").toBe(box.vh);
        expect(Math.round(box.width), "full width").toBe(box.vw);

        // No close button down here: it's swipeable, and the backdrop is a
        // big easy target for a thumb.
        await expect(page.locator(panel).getByRole("button", { name: "Close" })).toBeHidden();
    });
});
