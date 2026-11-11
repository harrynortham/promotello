import { test, expect } from "@playwright/test";
import fs from "fs";

import { STATE_PATH } from "../global-setup";
import { codeFor } from "../sign-in";

// There are no passwords: you give an email address and type the
// six-digit code we send to it.

test("a code signs you in, and a wrong one says so", async ({ page }) => {
    const { customerEmail } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // Nothing is emailed to a made-up address; the code itself is minted
    // with the admin API, exactly as the email would have carried it.
    await page.route(/\/auth\/v1\/otp/, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    await page.goto("/login");
    await expect(page.getByLabel("Password")).toHaveCount(0);

    await page.locator("#login-email").fill(customerEmail);
    await page.getByRole("button", { name: "Email me a code" }).click();

    await expect(page.getByText(`We've sent a 6-digit code to ${customerEmail}`)).toBeVisible();

    await page.locator("#login-code").fill("000000");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/that code is wrong or has expired/i)).toBeVisible();

    await page.locator("#login-code").fill(await codeFor(customerEmail));
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard**", { timeout: 20_000 });
});

test("the code must look like a code before we ask Supabase", async ({ page }) => {
    const { customerEmail } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.route(/\/auth\/v1\/otp/, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    await page.goto("/login");
    await page.locator("#login-email").fill(customerEmail);
    await page.getByRole("button", { name: "Email me a code" }).click();

    await page.locator("#login-code").waitFor();
    await page.locator("#login-code").fill("12345");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter the 6-digit code from your email.")).toBeVisible();
});

// Signing in and signing up are the same two steps. The only difference is
// whether an address nobody has used before makes an account.
test("signing up asks for an account; signing in doesn't", async ({ page }) => {
    const asked: { create_user?: boolean }[] = [];

    await page.route(/\/auth\/v1\/otp/, async (route) => {
        asked.push(route.request().postDataJSON());
        await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/signup");
    await page.locator("#signup-email").fill(`e2e-signup-${Date.now()}@test.internal`);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.locator("#signup-code").waitFor();

    await page.goto("/login");
    await page.locator("#login-email").fill(`e2e-signin-${Date.now()}@test.internal`);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.locator("#login-code").waitFor();

    expect(asked.map((body) => body.create_user)).toEqual([true, false]);
});

// This one lets the real request through: Supabase refuses to make an
// account from the sign-in form, which is how we know nobody has that
// address — and nothing is emailed, because there is nobody to email.
test("signing in with an address nobody has offers to make an account", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill(`e2e-nobody-${Date.now()}@test.internal`);
    await page.getByRole("button", { name: "Email me a code" }).click();

    await expect(page.getByText("We couldn't find an account for that email.")).toBeVisible({
        timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
    await expect(page.locator("#login-code")).toHaveCount(0);
});

// Stepping back to change the address and then not changing it used to
// ask for a code Supabase wouldn't send, and the refusal — "use the last
// one we sent you" — arrived on a screen with nowhere to type it.
test("going back and asking for the same address returns to the code", async ({ page }) => {
    const { customerEmail } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    let asked = 0;

    await page.route(/\/auth\/v1\/otp/, async (route) => {
        asked += 1;
        await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/login");
    await page.locator("#login-email").fill(customerEmail);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.locator("#login-code").waitFor({ timeout: 15_000 });
    expect(asked, "one code asked for").toBe(1);

    await page.getByRole("button", { name: "Use a different email" }).click();
    await expect(page.locator("#login-email")).toBeVisible();

    // The same address, inside the minute.
    await page.locator("#login-email").fill(customerEmail);
    await page.getByRole("button", { name: "Email me a code" }).click();

    await expect(page.locator("#login-code")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/We already sent a 6-digit code/)).toBeVisible();
    await expect(page.getByText(/That's a lot of codes/)).toHaveCount(0);
    expect(asked, "and no second code was asked for").toBe(1);
});

// The six boxes are a drawing over one real field. That is what keeps a
// pasted code, a phone's "from Mail" suggestion and a screen reader
// working, and it is only true while these attributes are on it.
test("the code is one field, however many boxes are drawn", async ({ page }) => {
    const { customerEmail } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.route(/\/auth\/v1\/otp/, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    await page.goto("/login");
    await page.locator("#login-email").fill(customerEmail);
    await page.getByRole("button", { name: "Email me a code" }).click();

    const field = page.locator("#login-code");
    await field.waitFor({ timeout: 15_000 });

    await expect(page.locator('input[autocomplete="one-time-code"]')).toHaveCount(1);
    await expect(field).toHaveAttribute("autocomplete", "one-time-code");
    await expect(field).toHaveAttribute("inputmode", "numeric");
    await expect(field).toHaveAttribute("maxlength", "6");

    // One label, pointing at it.
    await expect(page.locator('label[for="login-code"]')).toHaveCount(1);

    // A whole code arriving at once — pasted, or filled in by the phone —
    // lands in it and fills the boxes.
    await field.fill("123456");
    await expect(field).toHaveValue("123456");

    const boxes = page.locator('[aria-hidden="true"] > div').filter({ hasText: /^[0-9]$/ });
    await expect(boxes).toHaveCount(6);
});
