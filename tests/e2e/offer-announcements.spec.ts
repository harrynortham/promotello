import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { emailFollowersAboutOffer, retryOfferAnnouncements } from "../../lib/new-offer-email";
import { STATE_PATH } from "../global-setup";

// An offer is announced to followers once, when it is approved. If that
// send is rejected — over the daily cap, say — the claims are released and
// nothing used to pick them up again, so the offer was never announced.
// The daily job now does. Test addresses are never really emailed.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

function claimsFor(offerId: string) {
    return admin()
        .from("offer_email_sends")
        .select("user_id", { count: "exact", head: true })
        .eq("offer_id", offerId)
        .then(({ count }) => count ?? 0);
}

test.describe("announcing an offer to followers", () => {
    let offerId: string;
    let businessId: string;
    let customerUserId: string;

    test.beforeEach(async () => {
        ({ businessId, customerUserId } = state());

        await admin()
            .from("business_followers")
            .upsert({ business_id: businessId, user_id: customerUserId, emails_enabled: true });

        const { data, error } = await admin()
            .from("offers")
            .insert({
                business_id: businessId,
                created_by: state().businessUserId,
                slug: `e2e-announce-${Date.now()}`,
                title: "E2E Announcement Offer",
                category: "Testing",
                discount: "5% off",
                description: "For the announcement retry test.",
                availability: "Any time",
                expires_at: "2030-12-31",
                terms: "For automated tests only.",
                approval_status: "approved",
            })
            .select("id")
            .single();

        expect(error).toBeNull();
        offerId = data!.id;
    });

    test.afterEach(async () => {
        await admin().from("offers").delete().eq("id", offerId);
        await admin().from("business_followers").delete().eq("business_id", businessId).eq("user_id", customerUserId);
    });

    test("a send that was rejected is made again the next day", async () => {
        await emailFollowersAboutOffer(offerId);
        expect(await claimsFor(offerId), "the follower was claimed on approval").toBe(1);

        // What a rejected batch leaves behind: the claim is released, so the
        // follower looks like someone who has never been told.
        await admin().from("offer_email_sends").delete().eq("offer_id", offerId);
        expect(await claimsFor(offerId)).toBe(0);

        const retried = await retryOfferAnnouncements({ onlyOffer: offerId });
        expect(retried.offers, "the offer was picked up again").toBe(1);
        expect(await claimsFor(offerId), "the follower is told").toBe(1);
    });

    test("nobody is told twice, however often it runs", async () => {
        await emailFollowersAboutOffer(offerId);

        for (let run = 0; run < 3; run++) {
            const retried = await retryOfferAnnouncements({ onlyOffer: offerId });
            expect(retried.offers, `run ${run + 1}`).toBe(0);
        }

        expect(await claimsFor(offerId)).toBe(1);
    });

    test("an offer too old to be news is left alone", async () => {
        // Last week's offer, never announced: too late to send now. Written
        // as an insert, because updating a row sets updated_at to now.
        const lastWeek = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data: old, error } = await admin()
            .from("offers")
            .insert({
                business_id: businessId,
                created_by: state().businessUserId,
                slug: `e2e-announce-old-${Date.now()}`,
                title: "E2E Old Announcement Offer",
                category: "Testing",
                discount: "5% off",
                description: "Approved last week and never announced.",
                availability: "Any time",
                expires_at: "2030-12-31",
                terms: "For automated tests only.",
                approval_status: "approved",
                created_at: lastWeek,
                updated_at: lastWeek,
            })
            .select("id")
            .single();

        expect(error).toBeNull();

        try {
            const retried = await retryOfferAnnouncements({ onlyOffer: old!.id });

            expect(retried.offers).toBe(0);
            expect(await claimsFor(old!.id)).toBe(0);
        } finally {
            await admin().from("offers").delete().eq("id", old!.id);
        }
    });
});
