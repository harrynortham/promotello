import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

test("free business at its live offer limit is asked to upgrade", async ({ page }) => {
    const { freeBusinessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${freeBusinessId}/offers`);
    await expect(page.getByText("Free plan · 1 of 1 live offer used")).toBeVisible();

    await page.goto(`/business/${freeBusinessId}/offers/new`);
    await expect(
        page.getByRole("heading", { name: "You've reached your live offer limit" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();
});

test("the database rejects a second live offer on the Free plan", async () => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // Bypass the UI and insert directly as the signed-in owner.
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: state.businessEmail,
        password: state.testPassword,
    });
    expect(signInError).toBeNull();

    const { error } = await supabase.from("offers").insert({
        business_id: state.freeBusinessId,
        created_by: state.businessUserId,
        slug: `e2e-over-limit-${Date.now()}`,
        title: "Over the limit",
        category: "Testing",
        discount: "1% off",
        description: "Should be rejected by the plan limit trigger.",
        availability: "Available now",
        expires_at: "2030-12-31",
        terms: "For automated tests only.",
        approval_status: "pending",
    });

    expect(error?.code).toBe("P0004");
});
