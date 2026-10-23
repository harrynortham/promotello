import { test as setup } from "@playwright/test";
import fs from "fs";
import { STATE_PATH, CUSTOMER_AUTH, BUSINESS_AUTH } from "./global-setup";

setup("save customer auth state", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto("/login");
    await page.locator("#login-email").fill(state.customerEmail);
    await page.locator("#login-password").fill(state.testPassword);
    await page.locator('button[type="submit"]').click();

    // Wait for the dashboard URL and then for all network activity to settle
    // so the Supabase session cookie is written by the middleware cycle.
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    await page.context().storageState({ path: CUSTOMER_AUTH });
});

setup("save business auth state", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto("/login?next=/business/dashboard");
    await page.locator("#login-email").fill(state.businessEmail);
    await page.locator("#login-password").fill(state.testPassword);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL("**/business/dashboard**", { timeout: 15_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    await page.context().storageState({ path: BUSINESS_AUTH });
});
