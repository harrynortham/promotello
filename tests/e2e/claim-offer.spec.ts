import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, CUSTOMER_AUTH } from "../global-setup";
import { enterSignInCode } from "../sign-in";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

test.use({ storageState: CUSTOMER_AUTH });

test("signed-in customer can claim an approved offer", async ({ page }) => {
    const { claimOfferSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/offers/${claimOfferSlug}`);

    // The redeem button is visible for authenticated users who haven't claimed yet.
    const claimButton = page.getByRole("button", { name: "Get this deal" });
    await expect(claimButton).toBeVisible({ timeout: 10_000 });

    await claimButton.click();

    // After a successful claim the redemption code card replaces the button.
    await expect(page.getByText("Your claimed voucher")).toBeVisible({ timeout: 10_000 });

    // The code should be a non-empty monospace string.
    const codeEl = page.locator(".font-mono").first();
    const code = (await codeEl.textContent())?.trim() ?? "";
    expect(code.length).toBeGreaterThan(0);

    // "View my voucher" opens that voucher, not the list of them.
    await page.getByRole("button", { name: "View my voucher" }).click();
    await page.waitForURL(/\/dashboard\/redemptions\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByText(code).first()).toBeVisible({ timeout: 15_000 });

    // And what the offer actually covers, which the title only names.
    // .first(): the offer page it came from is still mounted, hidden.
    await expect(page.getByText("What you get")).toBeVisible();
    await expect(page.getByText("A test offer for the claim flow.").first()).toBeVisible();
});

test.describe("signed out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    // "Log in to claim this deal" is one thing asked for, not two. It used
    // to return them to the page with the button to press again.
    test("logging in from an offer claims it, and lands on the voucher", async ({ page }) => {
        const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

        // The test above claims this offer, so start from unclaimed: this
        // one is about the claim that finishes itself.
        const { data: offer } = await admin()
            .from("offers")
            .select("id")
            .eq("slug", state.claimOfferSlug)
            .single();
        await admin()
            .from("offer_redemptions")
            .delete()
            .eq("offer_id", offer!.id)
            .eq("user_id", state.customerUserId);

        await page.goto(`/offers/${state.claimOfferSlug}`);
        await page.getByText("Log in to claim this deal").click();

        await enterSignInCode(page, state.customerEmail);

        await page.waitForURL(`**/offers/${state.claimOfferSlug}`, { timeout: 20_000 });

        // No second press, and nothing left to press.
        await expect(page.getByText("Your claimed voucher")).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole("button", { name: "Get this deal" })).toHaveCount(0);

        const { data: claimed } = await admin()
            .from("offer_redemptions")
            .select("id")
            .eq("offer_id", offer!.id)
            .eq("user_id", state.customerUserId)
            .maybeSingle();
        expect(claimed, "the voucher is theirs").not.toBeNull();
    });
});
