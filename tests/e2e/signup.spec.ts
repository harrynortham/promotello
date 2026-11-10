import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { codeFor } from "../sign-in";

// No stored auth — this test exercises the public signup form.
test.use({ storageState: { cookies: [], origins: [] } });

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

test.describe("Sign up", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/signup");
    });

    test("asks for an email address before it sends anything", async ({ page }) => {
        await page.getByRole("button", { name: "Email me a code" }).click();

        await expect(page.getByText("Enter your email address.")).toBeVisible();
        await expect(page.locator("#signup-code")).toHaveCount(0);
    });

    test("an address nobody has used gets an account", async ({ page }) => {
        test.setTimeout(90_000);

        // A unique address on Resend's test inbox: the code email is
        // accepted without being delivered, so it never bounces (bounces
        // hurt the sending domain's reputation). This one goes out for
        // real, which is the point — nothing else proves a stranger can
        // make an account.
        const email = `delivered+e2e-signup-${Date.now()}@resend.dev`;

        await page.locator("#signup-email").fill(email);
        await page.getByRole("button", { name: "Email me a code" }).click();

        await expect(page.getByText(`We've sent a 6-digit code to ${email}`)).toBeVisible({
            timeout: 20_000,
        });

        try {
            await page.locator("#signup-code").fill(await codeFor(email));
            await page.getByRole("button", { name: "Sign in" }).click();

            await page.waitForURL("**/dashboard**", { timeout: 25_000 });
        } finally {
            const { data } = await admin().auth.admin.listUsers();
            const created = data.users.find((user) => user.email === email);
            if (created) await admin().auth.admin.deleteUser(created.id);
        }
    });
});

// Someone part-way through claiming an offer who realises they already
// have an account should land back on the offer, not the dashboard.
test("the sign-in link keeps where you were going", async ({ page }) => {
    await page.goto("/signup?next=%2Foffers%2Fsome-offer");
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/login?next=%2Foffers%2Fsome-offer",
    );

    // And stays a plain link when there is nowhere to go back to.
    await page.goto("/signup");
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
});
