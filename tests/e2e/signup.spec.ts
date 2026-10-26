import { test, expect } from "@playwright/test";

// No stored auth — this test exercises the public signup form.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Sign up", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/signup");
    });

    test("rejects passwords shorter than 8 characters", async ({ page }) => {
        await page.locator("#signup-email").fill("test@example.com");

        await page.locator("#signup-password").fill("short");
        await page.locator('button[type="submit"]').click();

        await expect(
            page.getByText("Choose a password with at least 8 characters."),
        ).toBeVisible();
    });

    test("submitting a valid form shows a confirmation or redirects to the dashboard", async ({
        page,
    }) => {
        // A unique address on Resend's test inbox: Supabase's confirmation
        // email is accepted without being delivered, so it never bounces
        // (bounces hurt the sending domain's reputation).
        const email = `delivered+e2e-signup-${Date.now()}@resend.dev`;

        await page.locator("#signup-email").fill(email);
        await page.locator("#signup-password").fill("E2eTestPass1!");
        await page.locator('button[type="submit"]').click();

        // Supabase may auto-confirm or require email verification depending
        // on project settings — accept either outcome.
        await Promise.race([
            page.waitForURL("**/dashboard**", { timeout: 15_000 }),
            expect(page.getByText("Check your inbox.")).toBeVisible({ timeout: 15_000 }),
        ]);
    });
});
