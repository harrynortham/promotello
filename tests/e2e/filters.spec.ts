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
