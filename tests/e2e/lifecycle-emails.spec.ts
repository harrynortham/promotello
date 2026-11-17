import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { lifecycleEmail, sendLifecycleEmails, sendTrialStartedEmail, trialStartedEmail, type LifecycleDue } from "../../lib/business-lifecycle";
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
        // The first three of the seven the dashboard counts, in its
        // order, and the rest left to the checklist.
        expect(email.text).toContain("1. Add your logo");
        expect(email.text).toContain("2. Say what you're known for");
        expect(email.text).toContain("3. Add your address");

        expect(await claim(businessId)).toEqual([]);
    });

    test("after two days, a nudge for the first missing step; none once set up", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(3) }).eq("id", businessId);

        const [nudge] = await claim(businessId);
        expect(nudge.kind).toBe("setup_nudge_1");

        // Whatever the dashboard would ask for first, which for a page
        // with nothing on it is the logo.
        const email = lifecycleEmail(nudge, nudge.emails[0])!;
        expect(email.subject).toMatch(/^Add your logo for E2E Lifecycle/);
        expect(email.text).toContain(`/business/${businessId}/logo`);
        expect(email.text).toContain("Turn off setup tips");

        // Then down the list, in the dashboard's order.
        const profile = { ...nudge.details, has_logo: true, has_description: true, has_address: true, has_hours: true };

        expect(lifecycleEmail({ ...nudge, details: { ...profile, has_logo: false } }, "a@b.c")!.subject)
            .toMatch(/^Add your logo/);
        expect(lifecycleEmail({ ...nudge, details: profile }, "a@b.c")!.subject)
            .toMatch(/^Add a cover photo/);

        // With the page finished, the offer is next. Sending it used to
        // sit here, and it is not a step any more: a page comes to us on
        // its own once it is a listing
        // (20270123090000_the_queue_fills_itself.sql).
        const ready = { ...profile, has_cover: true, profile_ready: true };
        expect(lifecycleEmail({ ...nudge, details: ready }, "a@b.c")!.subject)
            .toMatch(/^Post your first offer/);
        expect(lifecycleEmail({ ...nudge, details: ready }, "a@b.c")!.text)
            .not.toMatch(/Send your page for review/);

        const sent = { ...ready, sent_for_review: true };
        expect(lifecycleEmail({ ...nudge, details: sent }, "a@b.c")!.subject)
            .toMatch(/^Post your first offer/);

        // Set up, on Free: the loyalty card is part of Pro, so there is
        // nothing left to nudge about and nothing is sent.
        expect(
            lifecycleEmail(
                { ...nudge, hasPro: false, details: { ...sent, has_offer: true, has_poster: true } },
                "a@b.c",
            ),
        ).toBeNull();
    });

    test("the loyalty card is a step only for a business that can start one", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(3) }).eq("id", businessId);

        const [claimed] = await claim(businessId);
        expect(claimed.kind).toBe("setup_nudge_1");
        // With the page sent, the cover and the offer done, the loyalty
        // card is next.
        const nudge = {
            ...claimed,
            details: {
                ...claimed.details,
                has_logo: true,
                has_description: true,
                has_address: true,
                has_hours: true,
                has_cover: true,
                profile_ready: true,
                has_offer: true,
                sent_for_review: true,
            },
        };

        // On Free it is not an unfinished page, it is a thing to buy,
        // and enforce_loyalty_plan will not let them start one — so the
        // nudge moves on to the poster rather than selling in a
        // checklist. The loyalty_pitch email makes that case on its own.
        const free = lifecycleEmail({ ...nudge, hasPro: false, approved: true }, "a@b.c")!;
        expect(free.subject).toMatch(/^Print your QR poster/);
        expect(free.text).not.toContain("loyalty card");

        const pro = lifecycleEmail({ ...nudge, hasPro: true, approved: true }, "a@b.c")!;
        expect(pro.subject).toMatch(/^Set up your loyalty card/);
        expect(pro.text).toContain(`/business/${businessId}/loyalty`);
    });

    test("the welcome email explains approval only while the business is waiting", async () => {
        const [welcome] = await claim(businessId);

        expect(lifecycleEmail({ ...welcome, hasPro: false, approved: false }, "a@b.c")!.text).toContain("we'll email you as soon as you're live");
        expect(lifecycleEmail({ ...welcome, hasPro: false, approved: true }, "a@b.c")!.text).not.toContain("as soon as you're live");
    });

    test("free businesses get one email at a time, with a day off in between", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(8) }).eq("id", businessId);
        const backdate = (days: number) =>
            admin().from("business_lifecycle_sends").update({ sent_at: daysAgo(days) }).eq("business_id", businessId);

        // Several are due, so they come in schedule order.
        expect((await claim(businessId)).map((due) => due.kind)).toEqual(["setup_nudge_1"]);
        // Nothing the next day.
        await backdate(1);
        expect(await claim(businessId)).toEqual([]);

        await backdate(3);
        expect((await claim(businessId)).map((due) => due.kind)).toEqual(["loyalty_pitch"]);
        await backdate(3);
        expect((await claim(businessId)).map((due) => due.kind)).toEqual(["setup_nudge_2"]);
        await backdate(3);
        expect((await claim(businessId)).map((due) => due.kind)).toEqual(["founding_places"]);
    });

    // The trial is once per business, so a business that has had one is
    // never pitched it again. The founding price is not the trial: it is
    // still there to take, and since
    // 20270119090000_asking_a_business_to_come_back.sql a business whose
    // plan ended is reachable for it again — being shut out of every
    // pitch for good was the thing that migration was written to stop.
    test("a business that has subscribed is not pitched the trial, but is still offered the price", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(8) }).eq("id", businessId);
        await admin().from("subscriptions").insert({
            business_id: businessId,
            stripe_subscription_id: `sub_e2e_pitch_${Date.now()}`,
            stripe_customer_id: `cus_e2e_pitch_${Date.now()}`,
            status: "canceled",
        });

        const kinds: string[] = [];

        for (let run = 0; run < 4; run++) {
            kinds.push(...(await claim(businessId)).map((due) => due.kind));
            await admin()
                .from("business_lifecycle_sends")
                .update({ sent_at: daysAgo(3) })
                .eq("business_id", businessId);
        }

        // loyalty_pitch is the one that sells the free trial, and it
        // still asks for never_subscribed.
        expect(kinds, "never pitched the trial again").not.toContain("loyalty_pitch");
        expect(kinds, "but the founding price is still open").toContain("founding_places");
    });

    test("the conversion emails", async () => {
        const [welcome] = await claim(businessId);
        const due = (kind: LifecycleDue["kind"], details: Partial<LifecycleDue["details"]> = {}) =>
            ({ ...welcome, kind, hasPro: false, approved: true, details: { ...welcome.details, ...details } });

        const pitch = lifecycleEmail(due("loyalty_pitch"), "a@b.c")!;
        expect(pitch.subject).toMatch(/^A loyalty card for E2E Lifecycle .*, free for 30 days$/);
        expect(pitch.text).toContain(`/business/${businessId}/billing`);
        expect(pitch.text).toContain("Turn off setup tips");

        const founding = lifecycleEmail(due("founding_places"), "a@b.c", { foundingPlacesLeft: 12 })!;
        expect(founding.text).toContain("There are 12 places left.");
        expect(lifecycleEmail(due("founding_places"), "a@b.c", { foundingPlacesLeft: 0 })!.text).not.toContain("founding");

        // A visit is what makes the numbers worth reciting. Claims and
        // page views without one are interest, and say so.
        const results = lifecycleEmail(due("results", { visits: 6, views: 40, claims: 3 }), "a@b.c")!;
        expect(results.text).toContain("6 customer visits, 3 vouchers claimed, 40 page views");

        const interest = lifecycleEmail(due("results", { views: 40, claims: 3 }), "a@b.c")!;
        expect(interest.subject).toMatch(/^People are finding /);
        expect(interest.text).toContain("3 vouchers have been claimed");
        expect(interest.text).not.toContain("40 page views");
        const quiet = lifecycleEmail(due("results", { has_poster: false }), "a@b.c")!;
        expect(quiet.text).toContain(`/business/${businessId}/qr`);

        const checkIn = lifecycleEmail(due("check_in"), "a@b.c")!;
        expect(checkIn.senderName).toBe("Harry");
        expect(checkIn.text).toContain("Just reply to this email");
        expect(checkIn.html).toContain("17546946");

        // Every email that asks a business to pay says what it costs.
        // Three of them used to leave the price out entirely.
        for (const [name, email] of [
            ["loyalty pitch", pitch],
            ["founding places", founding],
            ["Pro summary", lifecycleEmail(due("founding_places"), "a@b.c", { foundingPlacesLeft: 0 })!],
            ["results", results],
        ] as const) {
            expect(email.text, `${name} names a price`).toMatch(/£\d/);
        }

    });

    test("starting a trial sends what's unlocked, once Stripe confirms it", async () => {
        const subscriptionId = `sub_e2e_started_${Date.now()}`;
        await admin().from("subscriptions").insert({
            business_id: businessId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: `cus_e2e_started_${Date.now()}`,
            status: "trialing",
            trial_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        });

        // One email for the owner (a test address, so built but not sent).
        expect(await sendTrialStartedEmail(subscriptionId)).toMatchObject({ skipped: 1 });
        expect(await sendTrialStartedEmail("sub_unknown")).toEqual({ sent: 0 });

        const business = { id: businessId, name: "Harbour Grind" };
        const pro = trialStartedEmail(business, { tier: "pro", trialEnd: "2026-12-01T12:00:00Z", hasLoyalty: false }, "a@b.c");
        expect(pro.subject).toBe("Your Pro trial has started");
        expect(pro.text).toContain("runs until 1 December");
        expect(pro.text).toContain(`/business/${businessId}/loyalty`);
        expect(pro.text).not.toContain("With Growth");

        const growth = trialStartedEmail(business, { tier: "growth", trialEnd: "2026-12-01T12:00:00Z", hasLoyalty: true }, "a@b.c");
        expect(growth.subject).toBe("Your Growth trial has started");
        expect(growth.text).toContain("With Growth");
        expect(growth.text).toContain(`/business/${businessId}/qr`);
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

        const notice = (await claim(businessId)).find((due) => due.kind === "trial_ending")!;
        expect(notice).toBeDefined();
        const email = lifecycleEmail(notice, notice.emails[0])!;
        expect(email.subject).toMatch(/^Your Promotello trial ends on \d+ \w+$/);
        expect(email.text).toContain("carries on automatically");
        expect(await claim(businessId)).toEqual([]);
    });

    // A trial that took no card ends by stopping, so this is the one
    // lifecycle message that asks for something back. The email is good;
    // it is also an email, and the person who runs the dashboard is not
    // always the person reading it. So it is said in the app as well.
    test("a trial ending with no card is said in the app too, once", async () => {
        const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

        await admin().from("businesses").update({ created_at: daysAgo(26) }).eq("id", businessId);
        await admin().from("subscriptions").insert({
            business_id: businessId,
            stripe_subscription_id: `sub_e2e_nocard_${Date.now()}`,
            stripe_customer_id: `cus_e2e_nocard_${Date.now()}`,
            status: "trialing",
            trial_end: new Date(Date.now() + 4 * 86_400_000).toISOString(),
            has_payment_method: false,
        });

        await sendLifecycleEmails(businessId);

        const told = async () =>
            (
                await admin()
                    .from("notifications")
                    .select("title, body, href")
                    .eq("user_id", businessUserId)
                    .eq("dedupe_key", `trial-card-missing:${businessId}`)
            ).data ?? [];

        const first = await told();
        expect(first, "the people who run it are told in the app").toHaveLength(1);
        expect(first[0].title).toMatch(/goes back to Free on/);
        expect(first[0].href).toBe(`/business/${businessId}/billing`);

        // The claim is once-only and the dedupe key is a second lock, so
        // a business is not nagged every night the job runs.
        await sendLifecycleEmails(businessId);
        expect(await told(), "and told once").toHaveLength(1);
    });

    // A trial with a card behind it carries on by itself. Telling that
    // business its plan is about to stop would simply be wrong.
    test("a trial with a card is not told anything is stopping", async () => {
        const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

        await admin().from("businesses").update({ created_at: daysAgo(26) }).eq("id", businessId);
        await admin().from("subscriptions").insert({
            business_id: businessId,
            stripe_subscription_id: `sub_e2e_card_${Date.now()}`,
            stripe_customer_id: `cus_e2e_card_${Date.now()}`,
            status: "trialing",
            trial_end: new Date(Date.now() + 4 * 86_400_000).toISOString(),
            has_payment_method: true,
        });

        await sendLifecycleEmails(businessId);

        const { data } = await admin()
            .from("notifications")
            .select("id")
            .eq("user_id", businessUserId)
            .eq("dedupe_key", `trial-card-missing:${businessId}`);

        expect(data ?? []).toHaveLength(0);
    });
});

// Every other lifecycle email is measured from the day a business
// signed up and the last stops at 35 days, so a business that trials
// and lapses falls off the end of the schedule at the moment it is
// deciding. These two are measured from the day its plan ended instead
// (20270119090000_asking_a_business_to_come_back.sql).
test.describe("asking a business to come back", () => {
    let businessId: string;

    test.beforeEach(async () => {
        const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        const { data } = await admin()
            .from("businesses")
            .insert({
                name: `E2E Win back ${Date.now()}`,
                category: "Testing",
                approval_status: "approved",
                created_by: businessUserId,
                // Well past every schedule measured from sign-up, which
                // is the whole point: nothing else would be due.
                created_at: daysAgo(90),
            })
            .select("id")
            .single();
        businessId = data!.id;
        await admin().from("business_members").insert({ business_id: businessId, user_id: businessUserId, role: "owner" });
    });

    test.afterEach(async () => {
        await admin().from("businesses").delete().eq("id", businessId);
    });

    const planEndedDaysAgo = async (days: number) => {
        await admin().from("business_lifecycle_sends").delete().eq("business_id", businessId);
        await admin().from("business_lifecycle_sends").insert({ business_id: businessId, kind: "plan_ending" });
        await admin()
            .from("business_lifecycle_sends")
            .update({ sent_at: daysAgo(days) })
            .eq("business_id", businessId)
            .eq("kind", "plan_ending");
    };

    test("a plan that ended a week ago is asked back, and again at a month", async () => {
        await planEndedDaysAgo(8);
        expect((await claim(businessId)).map((due) => due.kind)).toEqual(["win_back_1"]);

        // Nothing more until the second is due.
        expect(await claim(businessId)).toEqual([]);

        await admin()
            .from("business_lifecycle_sends")
            .update({ sent_at: daysAgo(31) })
            .eq("business_id", businessId)
            .eq("kind", "plan_ending");
        await admin()
            .from("business_lifecycle_sends")
            .update({ sent_at: daysAgo(23) })
            .eq("business_id", businessId)
            .eq("kind", "win_back_1");

        expect((await claim(businessId)).map((due) => due.kind)).toEqual(["win_back_2"]);
    });

    test("a plan that ended yesterday is left alone, and so is an ancient one", async () => {
        await planEndedDaysAgo(2);
        expect(await claim(businessId), "too soon").toEqual([]);

        // The floor: without it, every business that ever lapsed would be
        // written to on the day this ships.
        await planEndedDaysAgo(200);
        expect(await claim(businessId), "too long ago").toEqual([]);
    });

    test("a business that came back is not chased", async () => {
        await planEndedDaysAgo(8);
        await admin().from("subscriptions").insert({
            business_id: businessId,
            stripe_subscription_id: `sub_e2e_back_${Date.now()}`,
            stripe_customer_id: `cus_e2e_back_${Date.now()}`,
            status: "active",
            tier: "pro",
        });

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

// The welcome names the first few and leaves the rest to the dashboard,
// so it says how many are left rather than a number that was true when
// it was written.
test("the welcome counts what it leaves to the checklist", async () => {
    const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const { data: created } = await admin()
        .from("businesses")
        .insert({ name: `E2E Counting ${Date.now()}`, category: "Testing", approval_status: "approved", created_by: businessUserId })
        .select("id")
        .single();

    await admin().from("business_members").insert({ business_id: created!.id, user_id: businessUserId, role: "owner" });

    try {
        const [welcome] = (await admin().rpc("claim_business_lifecycle_emails", { only_business: created!.id })).data as LifecycleDue[];
        const email = lifecycleEmail({ ...welcome, hasPro: false, approved: true }, "a@b.c")!;

        // The dashboard's first three, in its order.
        expect(email.text).toContain("1. Add your logo");
        expect(email.text.indexOf("Add your logo")).toBeLessThan(email.text.indexOf("Add your address"));

        // And the rest counted rather than listed. This one is already
        // approved, so sending the page is behind it: hours, cover,
        // offer and poster are what is left, with no loyalty card
        // because it is on Free.
        expect(email.text).toMatch(/Then four more, none of them long/);
        expect(email.text).not.toMatch(/things more/);
    } finally {
        await admin().from("businesses").delete().eq("id", created!.id);
    }
});
