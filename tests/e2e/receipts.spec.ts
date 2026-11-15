import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// A record of the moment something a customer was holding was taken.
//
// Claiming and joining write nothing on purpose — the person just did
// it, and it is on the screen in front of them. These two are the
// opposite: staff press the button, on their phone, and the thing the
// customer collected is gone.

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

const asCustomer = async () => {
    const { customerEmail, testPassword } = state();
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await client.auth.signInWithPassword({ email: customerEmail, password: testPassword });

    return client;
};

const notifications = async (userId: string, type: string) => {
    const { data } = await admin
        .from("notifications")
        .select("title, body, href, type")
        .eq("user_id", userId)
        .eq("type", type);

    return data ?? [];
};

test("claiming says nothing, and being marked used says what and where", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessId, businessUserId, customerUserId } = state();

    const { data: offer, error } = await admin
        .from("offers")
        .insert({
            business_id: businessId,
            created_by: businessUserId,
            slug: `e2e-receipt-${Date.now()}`,
            title: "E2E Receipt Test Offer",
            category: "Testing",
            discount: "10% off",
            description: "A test offer for the receipt.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
        })
        .select("id")
        .single();

    expect(error).toBeNull();

    await admin.from("notifications").delete().eq("user_id", customerUserId);

    try {
        const customer = await asCustomer();
        const { data: claim } = await customer.rpc("redeem_offer", { requested_offer_id: offer!.id });
        const { redemption_code: code } = claim as { redemption_code: string };

        // Claiming is the customer's own doing, on their own screen.
        expect(await notifications(customerUserId, "voucher_used"), "nothing on a claim").toEqual([]);

        // Staff mark it used, from the scan page they land on.
        const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await staff.goto(`/redeem/${code}`, { timeout: 120_000 });
        await staff.getByRole("button", { name: /Mark as used/i }).click({ timeout: 90_000 });

        // The action redirects when it is done, and the receipt is
        // written before that — so waiting for text would race the
        // button's own "Marking as used…".
        await staff.waitForURL(/done=1/, { timeout: 60_000 });

        const receipts = await notifications(customerUserId, "voucher_used");

        expect(receipts, "a receipt for the voucher").toHaveLength(1);
        expect(receipts[0].title).toMatch(/Voucher used at /);
        expect(receipts[0].body).toMatch(/E2E Receipt Test Offer/);
        expect(receipts[0].body, "and how to query it there and then").toMatch(/wasn't you/);
        expect(receipts[0].href).toBe("/dashboard/redemptions");
    } finally {
        await admin.from("notifications").delete().eq("user_id", customerUserId);
        await admin.from("offers").delete().eq("id", offer!.id);
    }
});

test("handing over a reward leaves the customer a receipt for it", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessId, customerUserId } = state();

    // A card of this test's own, full and ready to be claimed.
    const { data: program, error } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Receipt Card ${Date.now()}`,
            stamps_required: 3,
            reward: "A free flat white",
            is_active: true,
        })
        .select("id")
        .single();

    expect(error).toBeNull();

    const { data: card } = await admin
        .from("loyalty_cards")
        .insert({ program_id: program!.id, user_id: customerUserId, stamps: 3 })
        .select("id, card_code")
        .single();

    await admin.from("notifications").delete().eq("user_id", customerUserId);

    try {
        const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await staff.goto(`/stamp/${card!.card_code}`, { timeout: 120_000 });

        await staff.getByRole("button", { name: /Redeem reward/i }).click({ timeout: 90_000 });
        await staff.waitForURL(/done=reward/, { timeout: 60_000 });

        const receipts = await notifications(customerUserId, "reward_given");

        expect(receipts, "a receipt for the reward").toHaveLength(1);
        expect(receipts[0].title).toMatch(/Reward claimed at /);
        expect(receipts[0].body).toMatch(/A free flat white/);
        expect(receipts[0].body, "an open card starts again").toMatch(/starts again/);
        expect(receipts[0].href).toBe(`/loyalty/${program!.id}`);

        // The stamps are spent, and the receipt is not repeated for a
        // card sitting at zero.
        const { data: after } = await admin
            .from("loyalty_cards")
            .select("stamps, rewards_redeemed")
            .eq("id", card!.id)
            .single();

        expect(after?.stamps).toBe(0);
        expect(after?.rewards_redeemed).toBe(1);
    } finally {
        await admin.from("notifications").delete().eq("user_id", customerUserId);
        await admin.from("loyalty_programs").delete().eq("id", program!.id);
    }
});
