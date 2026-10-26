import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH } from "../global-setup";

// Business notification emails: what's due, and that each goes once.
// Recipients are @test.internal, so nothing is actually emailed.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

test.describe("business notifications", () => {
    let businessId: string;
    let offerId: string;

    test.beforeEach(async () => {
        const { businessUserId, customerUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        const supabase = admin();

        const { data: business } = await supabase
            .from("businesses")
            .insert({ name: `E2E Notifications ${Date.now()}`, category: "Testing", approval_status: "approved", created_by: businessUserId })
            .select("id")
            .single();
        businessId = business!.id;
        await supabase.from("business_members").insert({ business_id: businessId, user_id: businessUserId, role: "owner" });

        const { data: offer } = await supabase
            .from("offers")
            .insert({
                business_id: businessId,
                created_by: businessUserId,
                slug: crypto.randomUUID(),
                title: "E2E Limited Offer",
                category: "Testing",
                discount: "10% off",
                description: "A limited offer for the notifications test.",
                availability: "Available now",
                expires_at: "2030-12-31",
                terms: "For automated tests only.",
                approval_status: "approved",
                redemption_count: 0,
                max_redemptions: 12,
            })
            .select("id")
            .single();
        offerId = offer!.id;

        // One of twelve claimed, stamped the way redeem_offer() does.
        await supabase.from("offer_redemptions").insert({
            offer_id: offerId,
            user_id: customerUserId,
            redemption_code: `E2EN${Date.now()}`.slice(0, 16),
            redeemed_at: new Date().toISOString(),
        });
    });

    test.afterEach(async () => {
        await admin().from("businesses").delete().eq("id", businessId);
    });

    test("low inventory and fully claimed alerts go once each", async () => {
        const supabase = admin();

        // 11 left of 12: above the default threshold of 10.
        let { data } = await supabase.rpc("claim_offer_stock_alert", { requested_offer_id: offerId });
        expect(data).toEqual([]);

        // 10 left of 11: at the threshold.
        await supabase.from("offers").update({ max_redemptions: 11 }).eq("id", offerId);
        ({ data } = await supabase.rpc("claim_offer_stock_alert", { requested_offer_id: offerId }));
        expect(data).toEqual([expect.objectContaining({ kind: "low_inventory", remaining: 10, max_redemptions: 11 })]);
        expect(data![0].emails[0]).toMatch(/@test\.internal$/);

        // Once only.
        ({ data } = await supabase.rpc("claim_offer_stock_alert", { requested_offer_id: offerId }));
        expect(data).toEqual([]);

        // All claimed.
        await supabase.from("offers").update({ max_redemptions: 1 }).eq("id", offerId);
        ({ data } = await supabase.rpc("claim_offer_stock_alert", { requested_offer_id: offerId }));
        expect(data).toEqual([expect.objectContaining({ kind: "offer_fully_claimed", remaining: 0 })]);
    });

    test("alerts respect the business's settings", async () => {
        const supabase = admin();
        await supabase.from("business_notification_settings").upsert({ business_id: businessId, offer_fully_claimed_enabled: false });
        await supabase.from("offers").update({ max_redemptions: 1 }).eq("id", offerId);

        const { data } = await supabase.rpc("claim_offer_stock_alert", { requested_offer_id: offerId });
        expect(data).toEqual([]);
    });

    test("the daily summary goes only to businesses that turned it on, once", async () => {
        const supabase = admin();
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

        let { data } = await supabase.rpc("claim_daily_summaries", { summary_date: today });
        expect((data ?? []).filter((row: { business_id: string }) => row.business_id === businessId)).toEqual([]);

        await supabase.from("business_notification_settings").upsert({ business_id: businessId, daily_summary_enabled: true });
        ({ data } = await supabase.rpc("claim_daily_summaries", { summary_date: today }));
        const mine = (data ?? []).filter((row: { business_id: string }) => row.business_id === businessId);
        expect(mine).toEqual([expect.objectContaining({ claimed: 1, used: 0 })]);
        expect(mine[0].offers).toEqual([{ title: "E2E Limited Offer", claimed: 1, used: 0 }]);

        ({ data } = await supabase.rpc("claim_daily_summaries", { summary_date: today }));
        expect((data ?? []).filter((row: { business_id: string }) => row.business_id === businessId)).toEqual([]);
    });
});
