import { test, expect } from "@playwright/test";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// The logo and cover pages are where someone crops a picture and presses
// Save. The cropper used to fill the dashboard column — 864px square on a
// desktop — which put Save 450px below the fold, on a page whose whole job
// is that one button. The frame is capped against the window now, so this
// measures what the bug was: can you see the button without scrolling?
const SCREENS = [
    { name: "a 13-inch laptop", width: 1280, height: 800 },
    { name: "a larger desktop", width: 1440, height: 900 },
];

for (const screen of SCREENS) {
    test(`the save button is on screen while cropping on ${screen.name}`, async ({ browser }) => {
        const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

        const context = await browser.newContext({
            storageState: BUSINESS_AUTH,
            viewport: { width: screen.width, height: screen.height },
        });
        const page = await context.newPage();

        try {
            for (const kind of ["logo", "cover"] as const) {
                await page.goto(`/business/${businessId}/${kind}`);
                await page.getByRole("button", { name: "Upload from device" }).waitFor();

                // Nothing is saved by choosing a file: it is cropped first.
                await page
                    .locator(`input#${kind}`)
                    .setInputFiles("public/images/marketing/harbour-grind-cafe.jpg");

                const save = page.getByRole("button", {
                    name: kind === "logo" ? "Save logo" : "Save cover photo",
                });
                await expect(save).toBeVisible();

                const box = (await save.boundingBox())!;
                expect(
                    box.y + box.height,
                    `${kind}: Save sits at ${Math.round(box.y + box.height)}px down a ${screen.height}px window`,
                ).toBeLessThanOrEqual(screen.height);
            }
        } finally {
            await context.close();
        }
    });
}
