import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// Somebody came, and the business hears about it.
//
// Every other message a business gets from us is an approval, an expiry,
// a stock alert or a bill. This is the only one that is good news about
// a customer, and it goes once, ever (docs/LAUNCH-FUNNEL.md).

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

// A business of this test's own, so "first" means something: the seeded
// one has had customers since the suite was written.
async function seedBusinessWithOffer(businessUserId: string) {
    const client = admin();
    const stamp = Date.now();

    const { data: business, error } = await client
        .from("businesses")
        .insert({
            name: `E2E First Customer ${stamp}`,
            slug: `e2e-first-customer-${stamp}`,
            category: "Testing",
            description: "A business with nobody through the door yet.",
            approval_status: "approved",
        })
        .select("id")
        .single();

    expect(error).toBeNull();

    await client
        .from("business_members")
        .insert({ business_id: business!.id, user_id: businessUserId, role: "owner" });

    const { data: offer, error: offerError } = await client
        .from("offers")
        .insert({
            business_id: business!.id,
            created_by: businessUserId,
            slug: `e2e-first-customer-offer-${stamp}`,
            title: `E2E First Customer Offer ${stamp}`,
            category: "Testing",
            discount: "10% off",
            description: "A test offer, waiting for its first customer.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
        })
        .select("id, slug, title")
        .single();

    expect(offerError).toBeNull();

    return { businessId: business!.id, offer: offer! };
}

const notices = async (businessId: string) => {
    const { data } = await admin()
        .from("notifications")
        .select("type, title, body, href")
        .eq("business_id", businessId)
        .eq("type", "first_customer");

    return data ?? [];
};

test("the first claim tells the business, and the second says nothing", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessUserId, customerUserId } = state();

    const { businessId, offer } = await seedBusinessWithOffer(businessUserId);

    try {
        // Nothing has happened yet, so nothing has been said.
        expect(await notices(businessId), "quiet until somebody comes").toHaveLength(0);

        const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
        await page.goto(`/offers/${offer.slug}`, { timeout: 120_000 });

        await page.getByRole("button", { name: "Get this deal" }).click({ timeout: 90_000 });
        await expect(page.getByText("Your claimed voucher")).toBeVisible({ timeout: 90_000 });

        // The announcement is sent after the voucher email, in the same
        // server action, so it lands a beat after the card appears.
        await expect
            .poll(async () => (await notices(businessId)).length, { timeout: 60_000 })
            .toBe(1);

        const [told] = await notices(businessId);

        expect(told.title).toMatch(/^Your first customer at E2E First Customer /);
        expect(told.body).toContain(offer.title);
        expect(told.href).toBe(`/business/${businessId}/redemptions`);

        // The milestone is the lock, so a second customer is not a first
        // one. Claiming again as the same person is refused, so this is
        // the ledger itself: one row, and it cannot gain another.
        const { data: milestones } = await admin()
            .from("business_milestones")
            .select("kind")
            .eq("business_id", businessId);

        expect(milestones ?? []).toHaveLength(1);

        const claimedAgain = await admin().rpc("claim_business_milestone", {
            requested_business_id: businessId,
            requested_kind: "first_customer",
        });

        expect(claimedAgain.data, "the second one to notice sends nothing").toBe(false);
    } finally {
        await admin().from("notifications").delete().eq("business_id", businessId);
        await admin().from("offer_redemptions").delete().eq("user_id", customerUserId).eq("offer_id", offer.id);
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// A business that already has customers has had its first one, and
// being told about it now would be absurd — which is what the
// migration's backfill is for. The backfill itself is a one-off over
// rows that existed when it ran, so what is worth holding here is its
// purpose: a business whose milestone is already claimed is never told
// again, however the row got there.
test("a business whose first customer is already recorded is never told", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessUserId, customerUserId } = state();

    const { businessId, offer } = await seedBusinessWithOffer(businessUserId);

    try {
        // As the backfill would have left it.
        const claimed = await admin().rpc("claim_business_milestone", {
            requested_business_id: businessId,
            requested_kind: "first_customer",
        });

        expect(claimed.data).toBe(true);

        const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
        await page.goto(`/offers/${offer.slug}`, { timeout: 120_000 });

        await page.getByRole("button", { name: "Get this deal" }).click({ timeout: 90_000 });
        await expect(page.getByText("Your claimed voucher")).toBeVisible({ timeout: 90_000 });

        // Long enough that a send would have landed by now: the claim
        // itself was the slow part and it has already finished.
        await page.waitForTimeout(5_000);

        expect(await notices(businessId), "nothing, because this is not their first").toHaveLength(0);
    } finally {
        await admin().from("notifications").delete().eq("business_id", businessId);
        await admin().from("offer_redemptions").delete().eq("user_id", customerUserId).eq("offer_id", offer.id);
        await admin().from("businesses").delete().eq("id", businessId);
    }
});
