import { test, expect } from "@playwright/test";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// The shell every business dashboard page sits in: the sidebar, and what
// it offers wherever you are in the dashboard.

test.use({ storageState: BUSINESS_AUTH });

test("the sidebar links out to the page customers see", async ({ page }) => {
    const { businessId, businessSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // Not only the overview, which already had a button of its own.
    for (const path of [`/business/${businessId}`, `/business/${businessId}/offers`, `/business/${businessId}/qr`]) {
        await page.goto(path);

        const link = page.getByRole("link", { name: /Open .* page in a new tab/ });
        await expect(link, path).toHaveAttribute("href", `/businesses/${businessSlug}`);
        // A new tab: the dashboard is somewhere they are working.
        await expect(link, path).toHaveAttribute("target", "_blank");
    }

    // It is beside the name, not in the navigation below it.
    const beside = await page.evaluate(() => {
        const link = document.querySelector('aside a[aria-label^="Open "]');
        const heading = link?.closest("h2");
        return Boolean(heading && heading.textContent?.trim());
    });

    expect(beside, "the link sits with the business name").toBe(true);
});
