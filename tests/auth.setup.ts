import { test as setup } from "@playwright/test";
import fs from "fs";

import { STATE_PATH, CUSTOMER_AUTH, BUSINESS_AUTH } from "./global-setup";
import { signInWithCode } from "./sign-in";

setup("save customer auth state", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await signInWithCode(page, state.customerEmail);

    // Wait for the dashboard URL and then for all network activity to settle
    // so the Supabase session cookie is written by the middleware cycle.
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    await page.context().storageState({ path: CUSTOMER_AUTH });
});

setup("save business auth state", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await signInWithCode(page, state.businessEmail, "/business/dashboard");

    await page.waitForURL("**/business/dashboard**", { timeout: 15_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    await page.context().storageState({ path: BUSINESS_AUTH });
});
