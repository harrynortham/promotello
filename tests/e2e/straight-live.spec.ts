import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// A page we built does not wait for us.
//
// Approval sat exactly where enthusiasm peaks: a business whose page we
// built and vetted ourselves still had to finish the checklist, press
// send, and then wait (docs/LAUNCH-FUNNEL.md). Sending it is now the
// moment it goes live — but only for a page of ours, and only when the
// profile is the five things the send button is locked behind.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

async function seedPending(
    businessUserId: string,
    { ours, complete }: { ours: boolean; complete: boolean },
) {
    const client = admin();
    const stamp = Date.now();

    const { data: business, error } = await client
        .from("businesses")
        .insert({
            name: `E2E Straight Live ${stamp}`,
            slug: `e2e-straight-live-${stamp}`,
            category: "Testing",
            description: complete ? "A page built for them, ready to go." : null,
            logo_url: complete ? "logos/e2e.png" : null,
            cover_image_url: complete ? "covers/e2e.png" : null,
            approval_status: "pending",
        })
        .select("id")
        .single();

    expect(error).toBeNull();

    await client
        .from("business_members")
        .insert({ business_id: business!.id, user_id: businessUserId, role: "owner" });

    if (complete) {
        await client.from("business_locations").insert({
            business_id: business!.id,
            address_line_1: "1 Test Street",
            city: "Bristol",
            postcode: "BS1 1AA",
        });

        await client.from("business_hours").insert({
            business_id: business!.id,
            day_of_week: 1,
            opens_at: "09:00",
            closes_at: "17:00",
        });
    }

    if (ours) {
        await client.from("business_previews").insert({
            business_id: business!.id,
            sample_offer: "E2E sample offer",
            sample_reward: "E2E sample reward",
            sample_stamps: 8,
            claimed_at: new Date().toISOString(),
            claimed_by: businessUserId,
        });
    }

    return business!.id;
}

const statusOf = async (businessId: string) => {
    const { data } = await admin()
        .from("businesses")
        .select("approval_status, review_requested_at")
        .eq("id", businessId)
        .single();

    return data!;
};

// The business asks the way the dashboard asks.
const send = async (businessId: string) => {
    const { businessEmail, testPassword } = state();
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    await client.auth.signInWithPassword({ email: businessEmail, password: testPassword });

    return client.rpc("request_business_review", { requested_business_id: businessId });
};

test("a finished page of ours goes live the moment they send it", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: true, complete: true });

    try {
        const { error } = await send(businessId);
        expect(error).toBeNull();

        const after = await statusOf(businessId);

        expect(after.approval_status).toBe("approved");
        expect(after.review_requested_at, "they still asked, and we still record it").not.toBeNull();

        // And it is in the trail as an approval, not as a status that
        // changed itself.
        const { data: logged } = await admin()
            .from("audit_logs")
            .select("action")
            .eq("entity_id", businessId)
            .eq("action", "business_approved");

        expect(logged ?? []).toHaveLength(1);
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// A cold sign-up has never been read by anyone.
test("a page they built themselves still waits for us", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: false, complete: true });

    try {
        const { error } = await send(businessId);
        expect(error).toBeNull();

        const after = await statusOf(businessId);

        expect(after.approval_status, "queued, as before").toBe("pending");
        expect(after.review_requested_at).not.toBeNull();
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// The lock on the send button is in a page; this is a function, and an
// instant approval must never publish a half-finished page.
test("a page of ours that isn't finished still waits", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: true, complete: false });

    try {
        const { error } = await send(businessId);
        expect(error).toBeNull();

        expect((await statusOf(businessId)).approval_status).toBe("pending");
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

test("sending twice is still refused", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: true, complete: true });

    try {
        await send(businessId);
        const again = await send(businessId);

        expect(again.error?.message).toMatch(/already been sent/);
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

test("the dashboard says it is live rather than that it is queued", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: true, complete: true });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

        await page.goto(`/business/${businessId}?sent=live`, { timeout: 120_000 });

        await expect(page.getByText("You're live")).toBeVisible({ timeout: 90_000 });
        await expect(page.getByText(/nothing to wait for/)).toBeVisible();
        await expect(page.getByText("Sent for review")).toHaveCount(0);
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});
