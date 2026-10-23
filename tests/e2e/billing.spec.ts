import { test, expect } from "@playwright/test";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

// Requires `stripe listen --forward-to localhost:3000/api/stripe/webhook`
// so the subscription created in Checkout reaches the webhook.
test("business owner can start a founding member trial and open the billing portal", async ({
    page,
}) => {
    test.setTimeout(120_000);

    const { billingBusinessId: businessId } = JSON.parse(
        fs.readFileSync(STATE_PATH, "utf8"),
    );

    // On Free, the second offer is paused.
    await page.goto(`/business/${businessId}/offers`);
    await expect(page.getByText("Paused · Free plan limit")).toHaveCount(1);

    await page.goto(`/business/${businessId}/billing`);
    await expect(page.getByRole("heading", { name: "Choose a plan" })).toBeVisible();
    await expect(page.getByText("founding places left")).toBeVisible();

    // The founding member card is listed first.
    await page.getByRole("button", { name: "Start free trial" }).first().click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    // Stripe-hosted Checkout, test card.
    await page.locator("#cardNumber").fill("4242 4242 4242 4242");
    await page.locator("#cardExpiry").fill("12 / 34");
    await page.locator("#cardCvc").fill("123");
    await page.locator("#billingName").fill("E2E Test Owner");

    const postalCode = page.locator("#billingPostalCode");
    if (await postalCode.isVisible()) {
        await postalCode.fill("BS7 8AA");
    }

    await page.getByTestId("hosted-payment-submit-button").click();

    await page.waitForURL(`**/business/${businessId}/billing?checkout=success`, {
        timeout: 60_000,
    });

    // The webhook may land a moment after the redirect.
    await expect(async () => {
        await page.reload();
        await expect(page.getByText("Free trial", { exact: true })).toBeVisible({
            timeout: 2_000,
        });
    }).toPass({ timeout: 30_000 });

    await expect(page.getByText("Pro · founding member")).toBeVisible();
    await expect(page.getByText(/Your free trial ends on/)).toBeVisible();

    // Upgrading restores paused offers and removes the Free plan banner.
    await page.goto(`/business/${businessId}/offers`);
    await expect(page.getByText("Paused · Free plan limit")).toHaveCount(0);
    await expect(page.getByText(/Free plan ·/)).toHaveCount(0);

    await page.goto(`/business/${businessId}/billing`);
    await page.getByRole("button", { name: "Manage billing" }).click();
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 });
});
