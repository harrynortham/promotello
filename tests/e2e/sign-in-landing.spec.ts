import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH } from "../global-setup";
import { signInWithCode } from "../sign-in";

// Where the plain /login sends people. A page that asked for sign-in
// always wins; with nothing asked for, who you are decides.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

async function signIn(page: import("@playwright/test").Page, email: string, next?: string) {
    await signInWithCode(page, email, next);
}

test("someone who runs one business lands in it", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // The business user owns several, so this one is its own.
    const password = "E2e-Landing-Pass-123!";
    const email = `e2e-landing-${Date.now()}@test.internal`;
    const client = admin();

    const { data: created } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    const { data: business } = await client
        .from("businesses")
        .insert({
            name: `E2E Landing Business ${Date.now()}`,
            category: "Testing",
            description: "Automated test business — safe to delete.",
            approval_status: "approved",
            created_by: created.user!.id,
        })
        .select("id")
        .single();

    await client.from("business_members").insert({
        business_id: business!.id,
        user_id: created.user!.id,
        role: "owner",
    });

    try {
        await signIn(page, email);
        await page.waitForURL(`**/business/${business!.id}`, { timeout: 25_000 });

        // Asked for somewhere: that still wins, or claiming an offer breaks.
        await page.context().clearCookies();

        await signIn(page, email, `/offers/${state.claimOfferSlug}`);
        await page.waitForURL(`**/offers/${state.claimOfferSlug}`, { timeout: 25_000 });
    } finally {
        await client.from("businesses").delete().eq("id", business!.id);
        await client.auth.admin.deleteUser(created.user!.id);
    }
});

test("a customer still lands in the customer area", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await signIn(page, state.customerEmail);
    await page.waitForURL("**/dashboard", { timeout: 25_000 });
    await expect(page).toHaveURL(/\/dashboard$/);
});
