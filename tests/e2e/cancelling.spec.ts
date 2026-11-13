import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// What a business is told before it ends its plan, and what it is told
// when the ending lands
// (20270103090000_a_plan_ending_says_what_stops.sql).
//
// Nothing here goes near Stripe: the page stands in front of the
// portal, so a subscription row is all it needs to have something to
// talk about.

const needsMigration =
    "apply supabase/migrations/20270103090000_a_plan_ending_says_what_stops.sql first";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

// The seeded business is already on Pro — global-setup gives it a
// subscription row so it has Pro's features — so this moves that row
// rather than adding a second one the page would have to choose
// between.
async function onGrowthUntil(businessId: string, ends: Date) {
    const { data: before } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, tier, current_period_end")
        .eq("business_id", businessId)
        .single();

    await admin
        .from("subscriptions")
        .update({ tier: "growth", current_period_end: ends.toISOString() })
        .eq("stripe_subscription_id", before!.stripe_subscription_id);

    return async () => {
        await admin
            .from("subscriptions")
            .update({ tier: before!.tier, current_period_end: before!.current_period_end })
            .eq("stripe_subscription_id", before!.stripe_subscription_id);
    };
}

// Something in a window, so the numbers on the page are a fact rather
// than whatever the last test left behind.
async function aPosterInTheWindow(businessId: string) {
    const { data, error } = await admin
        .from("qr_codes")
        .insert({ business_id: businessId, label: "E2E cancelling window" })
        .select("id")
        .single();

    expect(error).toBeNull();

    return async () => {
        await admin.from("qr_codes").delete().eq("id", data!.id);
    };
}

test("the way out says what it costs, in the business's own numbers", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessId } = state();
    const ends = new Date(Date.now() + 20 * 864e5);
    const restorePlan = await onGrowthUntil(businessId, ends);
    const removePoster = await aPosterInTheWindow(businessId);

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        // The only route to cancelling is the Stripe portal button, so
        // this link is the one chance to say anything at all.
        await page.goto(`/business/${businessId}/billing`, { timeout: 120_000 });
        await page.getByRole("link", { name: "Thinking of cancelling?" }).click({ timeout: 90_000 });
        await page.waitForURL(/\/billing\/cancel$/, { timeout: 30_000 });

        await expect(page.getByRole("heading", { name: "Before you cancel", level: 1 })).toBeVisible({
            timeout: 60_000,
        });

        // The date it actually stops, read off the subscription.
        const when = ends.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        await expect(page.getByRole("heading", { name: `What stops on ${when}` })).toBeVisible();

        // Their own things, counted: the poster in the window is real,
        // and the sentence about it is true — it keeps working, they
        // just cannot make another.
        const posters = page.getByText("No more posters");
        await expect(posters).toBeVisible();
        await expect(page.getByText(/already up keep working, and keep counting scans/)).toBeVisible();

        // Growth loses more than Pro does, and the review prompts go
        // whichever plan it was.
        await expect(page.getByText("Google review prompts stop")).toBeVisible();
        await expect(page.getByText("Quiet hours stop being enforced")).toBeVisible();
        await expect(page.getByText(/whether any of it worked/)).toBeVisible();

        // And the half-way house, rather than nothing.
        await expect(page.getByRole("button", { name: "Switch to Pro" })).toBeVisible();

        // What doesn't change is said beside it, every time.
        await expect(page.getByRole("heading", { name: "What doesn't" })).toBeVisible();
        // Exact: the line at the foot of the page says it too.
        await expect(page.getByText("Nothing is deleted", { exact: true })).toBeVisible();

        // Leaving is a click away, and so is staying.
        await page.getByRole("button", { name: "Keep my plan" }).click({ timeout: 30_000 });
        await page.waitForURL(/\/billing$/, { timeout: 30_000 });
    } finally {
        await removePoster();
        await restorePlan();
        await page.context().close();
    }
});

test("a business on Free has nothing to cancel, and a stranger has no business asking", async ({ browser }) => {
    test.setTimeout(180_000);
    const { businessId, freeBusinessId } = state();

    // Never been paid for: there is no page to show.
    const owner = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await owner.goto(`/business/${freeBusinessId}/billing/cancel`, { timeout: 120_000 });
    await owner.waitForURL(/\/billing$/, { timeout: 90_000 });

    // Somebody who does not work there never gets in: the dashboard
    // layout turns them round before this page is reached.
    const stranger = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await stranger.goto(`/business/${businessId}/billing/cancel`, { timeout: 120_000 });
    await expect(stranger.getByRole("heading", { name: "Before you cancel" })).toHaveCount(0);

    // And somebody who does work there, but is not the owner or an
    // admin, cannot read the terms of a decision that is not theirs —
    // the same rule the billing portal already follows.
    const { data: was } = await admin
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", state().businessUserId)
        .single();

    await admin
        .from("business_members")
        .update({ role: "member" })
        .eq("business_id", businessId)
        .eq("user_id", state().businessUserId);

    try {
        const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await staff.goto(`/business/${businessId}/billing/cancel`, { timeout: 120_000 });
        await expect(staff.getByText(/Error 404/)).toBeVisible({ timeout: 90_000 });
    } finally {
        await admin
            .from("business_members")
            .update({ role: was!.role })
            .eq("business_id", businessId)
            .eq("user_id", state().businessUserId);
    }
});

test("closing says who is on the other side of it", async ({ browser }) => {
    test.setTimeout(240_000);
    const { businessId } = state();
    const removePoster = await aPosterInTheWindow(businessId);

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    await page.goto(`/business/${businessId}/settings`, { timeout: 120_000 });
    await page.getByRole("button", { name: "Close this business" }).click({ timeout: 90_000 });

    // The dialog was abstract until it counted the people in it.
    await expect(page.getByText(/^Right now: /)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/still scan, but what they open is a page saying you have left/)).toBeVisible();

    // And nothing is closed by reading about it.
    await page.getByRole("button", { name: "Keep it open" }).click();

    const { data: business } = await admin
        .from("businesses")
        .select("closed_at")
        .eq("id", businessId)
        .single();

    expect(business?.closed_at).toBeNull();

    await removePoster();
});

test("a business is told its plan is ending once, and again if it leaves twice", async () => {
    const { businessId } = state();

    await admin
        .from("business_lifecycle_sends")
        .delete()
        .eq("business_id", businessId)
        .eq("kind", "plan_ending");

    try {
        // The lock the webhook leans on: the first insert takes it…
        const { error: first } = await admin
            .from("business_lifecycle_sends")
            .insert({ business_id: businessId, kind: "plan_ending" });

        expect(first, needsMigration).toBeNull();

        // …and the second is refused, which is what stops four copies
        // of the same email going out on four subscription events.
        const { error: second } = await admin
            .from("business_lifecycle_sends")
            .insert({ business_id: businessId, kind: "plan_ending" });

        expect(second).not.toBeNull();
        expect(second!.code).toBe("23505");

        // Coming back clears it, so the next ending is told about too.
        await admin
            .from("business_lifecycle_sends")
            .delete()
            .eq("business_id", businessId)
            .eq("kind", "plan_ending");

        const { error: again } = await admin
            .from("business_lifecycle_sends")
            .insert({ business_id: businessId, kind: "plan_ending" });

        expect(again).toBeNull();
    } finally {
        await admin
            .from("business_lifecycle_sends")
            .delete()
            .eq("business_id", businessId)
            .eq("kind", "plan_ending");
    }
});
