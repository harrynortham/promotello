import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, CUSTOMER_AUTH } from "../global-setup";

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const adminClient = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);

async function createApprovedOffer(label: string) {
    const { businessId, businessUserId } = state();
    const { data, error } = await adminClient()
        .from("offers")
        .insert({
            business_id: businessId,
            created_by: businessUserId,
            slug: `e2e-follow-${label}-${Date.now()}`,
            title: `E2E Follower Offer ${label}`,
            category: "Testing",
            discount: "15% off",
            description: "A test offer for follower emails.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
        })
        .select("id")
        .single();
    expect(error).toBeNull();
    return data!.id as string;
}

async function recipientsFor(offerId: string) {
    const { data, error } = await adminClient().rpc("claim_new_offer_email_recipients", {
        requested_offer_id: offerId,
    });
    expect(error).toBeNull();
    return data as { user_id: string; email: string; unsubscribe_token: string }[];
}

test.describe.serial("followers", () => {
    test.use({ storageState: CUSTOMER_AUTH });

    test("customers follow a business and see it in their settings", async ({ page }) => {
        const { businessId } = state();

        await page.goto(`/businesses/${businessId}`);
        await page.getByRole("button", { name: "Follow", exact: true }).click();
        await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

        await page.reload();
        await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

        await page.goto("/account/notifications");
        await expect(page.getByRole("link", { name: "E2E Test Business" })).toBeVisible();
    });

    test("a new offer emails followers once, and unsubscribing stops it", async ({ page, request }) => {
        const { customerUserId } = state();

        const first = await recipientsFor(await createApprovedOffer("a"));
        const me = first.find((row) => row.user_id === customerUserId);
        expect(me).toBeTruthy();

        // The unsubscribe link works without signing in.
        await page.context().clearCookies();
        await page.goto(`/unsubscribe/${me!.unsubscribe_token}`);
        await expect(page.getByRole("heading", { name: "Stop emails from E2E Test Business?" })).toBeVisible();
        await page.getByRole("button", { name: "Unsubscribe from E2E Test Business" }).click();
        await expect(page.getByText("You're unsubscribed")).toBeVisible({ timeout: 10_000 });

        const second = await recipientsFor(await createApprovedOffer("b"));
        expect(second.find((row) => row.user_id === customerUserId)).toBeUndefined();

        // Mail apps' one-click unsubscribe also answers.
        const oneClick = await request.post(`/api/unsubscribe/${me!.unsubscribe_token}`, {
            form: { "List-Unsubscribe": "One-Click" },
        });
        expect(oneClick.status()).toBe(200);
    });

    test("each follower is emailed about an offer only once", async () => {
        const { businessId, customerEmail, testPassword, customerUserId } = state();

        const customer = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
        await customer.auth.signInWithPassword({ email: customerEmail, password: testPassword });
        await customer
            .from("business_followers")
            .update({ emails_enabled: true })
            .eq("business_id", businessId)
            .eq("user_id", customerUserId);

        const offerId = await createApprovedOffer("c");
        expect((await recipientsFor(offerId)).some((row) => row.user_id === customerUserId)).toBe(true);
        expect(await recipientsFor(offerId)).toEqual([]);

        // Only the server can list followers' email addresses.
        const { error } = await customer.rpc("claim_new_offer_email_recipients", { requested_offer_id: offerId });
        expect(error).not.toBeNull();
    });
});
