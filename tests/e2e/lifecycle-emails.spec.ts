import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { lifecycleEmail, type LifecycleDue } from "../../lib/business-lifecycle";
import { businessReviewedEmail, newBusinessAlertEmail, offerReviewedEmail } from "../../lib/business-review-emails";
import { STATE_PATH } from "../global-setup";

// The setup and trial emails: what's due when, and that each is sent once.
// Test addresses (@test.internal) are never actually emailed.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

async function claim(businessId: string) {
    const { data, error } = await admin().rpc("claim_business_lifecycle_emails", { only_business: businessId });
    expect(error).toBeNull();
    return (data ?? []) as LifecycleDue[];
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

test.describe("business setup and trial emails", () => {
    let businessId: string;

    test.beforeEach(async () => {
        const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        const { data, error } = await admin()
            .from("businesses")
            .insert({ name: `E2E Lifecycle ${Date.now()}`, category: "Testing", approval_status: "approved", created_by: businessUserId })
            .select("id")
            .single();
        expect(error).toBeNull();
        businessId = data!.id;
        await admin().from("business_members").insert({ business_id: businessId, user_id: businessUserId, role: "owner" });
    });

    test.afterEach(async () => {
        await admin().from("businesses").delete().eq("id", businessId);
    });

    test("a new business gets a welcome email, once", async () => {
        const first = await claim(businessId);
        expect(first.map((due) => due.kind)).toEqual(["welcome"]);
        expect(first[0].emails[0]).toMatch(/@test\.internal$/);

        const email = lifecycleEmail(first[0], first[0].emails[0])!;
        expect(email.subject).toContain("Welcome to Promotello");
        expect(email.text).toContain("Post your first offer");

        expect(await claim(businessId)).toEqual([]);
    });

    test("after two days, a nudge for the first missing step; none once set up", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(3) }).eq("id", businessId);

        const [nudge] = await claim(businessId);
        expect(nudge.kind).toBe("setup_nudge_1");
        const email = lifecycleEmail(nudge, nudge.emails[0])!;
        expect(email.subject).toMatch(/^Post your first offer for E2E Lifecycle/);
        expect(email.text).toContain(`/business/${businessId}/offers/new`);
        expect(email.text).toContain("Turn off setup tips");

        // Fully set up: nothing to nudge about.
        expect(lifecycleEmail({ ...nudge, details: { ...nudge.details, has_offer: true, has_loyalty: true, has_poster: true } }, "a@b.c")).toBeNull();
    });

    test("the loyalty step offers a free business the Pro trial, and goes straight to loyalty on Pro", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(3) }).eq("id", businessId);

        const [claimed] = await claim(businessId);
        expect(claimed.kind).toBe("setup_nudge_1");
        // With the offer done, the loyalty card is next.
        const nudge = { ...claimed, details: { ...claimed.details, has_offer: true } };

        const free = lifecycleEmail({ ...nudge, hasPro: false, approved: true }, "a@b.c")!;
        expect(free.subject).toMatch(/^Start a loyalty card with a free Pro trial/);
        expect(free.text).toContain(`/business/${businessId}/billing`);

        const pro = lifecycleEmail({ ...nudge, hasPro: true, approved: true }, "a@b.c")!;
        expect(pro.subject).toMatch(/^Set up your loyalty card/);
        expect(pro.text).toContain(`/business/${businessId}/loyalty`);
    });

    test("the welcome email explains approval only while the business is waiting", async () => {
        const [welcome] = await claim(businessId);

        expect(lifecycleEmail({ ...welcome, hasPro: false, approved: false }, "a@b.c")!.text).toContain("we'll email you as soon as you're live");
        expect(lifecycleEmail({ ...welcome, hasPro: false, approved: true }, "a@b.c")!.text).not.toContain("as soon as you're live");
    });

    test("businesses that signed up long ago get no setup emails", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(40) }).eq("id", businessId);
        expect(await claim(businessId)).toEqual([]);
    });

    test("a trial ending within five days gets a notice with what it achieved", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(26) }).eq("id", businessId);
        await admin().from("subscriptions").insert({
            business_id: businessId,
            stripe_subscription_id: `sub_e2e_lifecycle_${Date.now()}`,
            stripe_customer_id: `cus_e2e_lifecycle_${Date.now()}`,
            status: "trialing",
            trial_end: new Date(Date.now() + 4 * 86_400_000).toISOString(),
        });

        const [notice] = await claim(businessId);
        expect(notice.kind).toBe("trial_ending");
        const email = lifecycleEmail(notice, notice.emails[0])!;
        expect(email.subject).toMatch(/^Your Promotello trial ends on \d+ \w+$/);
        expect(email.text).toContain("carries on automatically");
        expect(await claim(businessId)).toEqual([]);
    });
});

test.describe("approval emails", () => {
    const business = { id: "b1", name: "Harbour Grind", slug: "harbour-grind" };
    const offer = { id: "o1", title: "Free pastry with any coffee", slug: "free-pastry", business: { id: "b1", name: "Harbour Grind" } };

    test("a business hears when it's live, or what to do if it wasn't approved", () => {
        const live = businessReviewedEmail(business, "approved", "a@b.c");
        expect(live.subject).toBe("Harbour Grind is live on Promotello");
        expect(live.text).toContain("/businesses/harbour-grind");

        const rejected = businessReviewedEmail(business, "rejected", "a@b.c");
        expect(rejected.text).toContain("Reply to this email");
    });

    test("a business hears about each offer decision", () => {
        expect(offerReviewedEmail(offer, "approved", "a@b.c").text).toContain("/offers/free-pastry");
        expect(offerReviewedEmail(offer, "rejected", "a@b.c").text).toContain("/business/b1/offers");
    });

    test("the inbox hears about each new business", () => {
        const alert = newBusinessAlertEmail({ name: "Harbour Grind", category: "Cafe", city: "Bristol" }, "owner@b.c", false);
        expect(alert.subject).toBe("New business: Harbour Grind");
        expect(alert.text).toContain("Harbour Grind (Cafe, Bristol) just signed up");
        expect(alert.text).toContain("owner@b.c");
    });
});
