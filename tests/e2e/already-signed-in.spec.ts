import { test, expect } from "@playwright/test";

import { BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

// A form for making an account is no use to somebody who has one. The
// sales pages send them to their dashboard instead, and the forms
// themselves send them on however they got there — a typed address, an
// old tab, a link in an email from before they signed up.

test.describe("somebody signed in", () => {
    test.use({ storageState: BUSINESS_AUTH });

    test("presses Start free on the sales pages and lands in their dashboard", async ({ page }) => {
        await page.goto("/business");

        const startFree = page.getByRole("button", { name: "Start free" }).first();
        await expect(startFree).toBeVisible({ timeout: 15_000 });

        // The href is swapped once the browser knows who is looking, so
        // give that a moment rather than racing it.
        await expect(startFree).toHaveAttribute("href", "/business/dashboard", { timeout: 10_000 });

        await startFree.click();
        await expect(page).toHaveURL(/\/business\/(dashboard|[0-9a-f-]{36})/);
    });

    test("can't open the business sign-up form", async ({ page }) => {
        await page.goto("/business/register");

        await expect(page).toHaveURL(/\/business\/(dashboard|[0-9a-f-]{36})/, { timeout: 15_000 });
        await expect(page.getByRole("button", { name: "Create your account" })).toHaveCount(0);
    });

    test("is sent where the link meant to send them, not to the form", async ({ page }) => {
        await page.goto("/business/register?next=%2Fbusiness%2Fdashboard");
        await expect(page).toHaveURL(/\/business\/(dashboard|[0-9a-f-]{36})/, { timeout: 15_000 });
    });
});

test.describe("a customer signed in", () => {
    test.use({ storageState: CUSTOMER_AUTH });

    test("can't open the customer sign-up form", async ({ page }) => {
        await page.goto("/signup");

        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
        await expect(page.getByRole("heading", { name: "Welcome to Promotello" })).toHaveCount(0);
    });

    test("with no business of their own still gets the business welcome, not the form", async ({ page }) => {
        await page.goto("/business/register");

        await expect(page).toHaveURL(/\/business\/dashboard/, { timeout: 15_000 });
        await expect(
            page.getByRole("heading", { name: "Promotello for Business", level: 1 }),
        ).toBeVisible();
    });
});

test.describe("signed out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("the forms are still there, and Start free still points at one", async ({ page }) => {
        await page.goto("/business/register");
        await expect(page.getByRole("button", { name: "Create your account" })).toBeVisible({
            timeout: 15_000,
        });

        await page.goto("/signup");
        await expect(page.getByRole("heading", { name: "Welcome to Promotello" })).toBeVisible();

        await page.goto("/business");
        await expect(page.getByRole("button", { name: "Start free" }).first()).toHaveAttribute(
            "href",
            "/business/register",
        );
    });
});
