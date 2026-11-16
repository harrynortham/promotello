import { test, expect } from "@playwright/test";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

// Requires `stripe listen --forward-to localhost:3000/api/stripe/webhook`
// so the subscription created in Checkout reaches the webhook. Without
// it the test pays, lands back on the billing page and then waits for a
// plan that nothing told us about — which is what the message on the
// assertion below says, because a red test nobody can explain is one
// everybody learns to ignore.
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

    // Stripe-hosted Checkout. A founding-member trial asks for no card
    // at all — the session is created with payment_method_collection
    // "if_required" (billing/actions.ts) so that starting a trial costs
    // nobody their card details, and Checkout then renders none of these
    // fields. Each one is filled only if it is actually on the page, so
    // this passes whether or not a card is being collected rather than
    // waiting out a timeout on a field that will never appear.
    // Two different Checkouts, and the difference is not only the
    // wording. One collecting a card puts its fields and a
    // hosted-payment-submit-button in the top-level page. The card-less
    // trial — payment_method_collection "if_required" in
    // billing/actions.ts, so starting a trial costs nobody their card
    // details — renders the form inside an iframe, with a plain "Start
    // trial" button and no testid. getByRole does not cross frames, so
    // the button has to be looked for in every frame.
    const findSubmit = async () => {
        const top = page.getByTestId("hosted-payment-submit-button");

        if (await top.count()) {
            return top.first();
        }

        for (const frame of page.frames()) {
            const button = frame.getByRole("button", { name: /^(Start trial|Subscribe|Pay)/ });

            if (await button.count()) {
                return button.first();
            }
        }

        return null;
    };

    let submit: NonNullable<Awaited<ReturnType<typeof findSubmit>>> | null = null;

    await expect(async () => {
        submit = await findSubmit();
        expect(submit, "no way to submit Stripe Checkout was found in any frame").not.toBeNull();
        await expect(submit!).toBeVisible();
    }).toPass({ timeout: 60_000 });

    const fillIfPresent = async (selector: string, value: string) => {
        const field = page.locator(selector);

        if (await field.isVisible()) {
            await field.fill(value);
        }
    };

    await fillIfPresent("#cardNumber", "4242 4242 4242 4242");
    await fillIfPresent("#cardExpiry", "12 / 34");
    await fillIfPresent("#cardCvc", "123");
    await fillIfPresent("#billingName", "E2E Test Owner");
    await fillIfPresent("#billingPostalCode", "BS7 8AA");

    await submit!.click();

    await page.waitForURL(`**/business/${businessId}/billing?checkout=success`, {
        timeout: 60_000,
    });

    // The webhook may land a moment after the redirect.
    await expect(async () => {
        await page.reload();
        await expect(
            page.getByText("Free trial", { exact: true }),
            "Checkout was paid but no plan appeared. Is `stripe listen --forward-to localhost:3000/api/stripe/webhook` running, with the whsec_ it prints in STRIPE_WEBHOOK_SECRET?",
        ).toBeVisible({ timeout: 2_000 });
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
