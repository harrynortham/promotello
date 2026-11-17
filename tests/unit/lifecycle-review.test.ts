import assert from "node:assert/strict";
import { test } from "node:test";

import { lifecycleEmail, resultsStrength, type LifecycleDue } from "@/lib/business-lifecycle";

function due(kind: LifecycleDue["kind"], overrides: Partial<LifecycleDue["details"]> = {}): LifecycleDue {
    return {
        business_id: "11111111-2222-3333-4444-555555555555",
        business_name: "Little Loaf",
        kind,
        emails: ["sam@example.com"],
        hasPro: true,
        approved: false,
        details: {
            has_offer: true,
            has_loyalty: true,
            has_poster: true,
            has_cover: true,
            sent_for_review: false,
            trial_end: null,
            since: "2026-12-01T00:00:00Z",
            followers: 0,
            loyalty_members: 0,
            claims: 0,
            visits: 0,
            qr_scans: 0,
            views: 0,
            ...overrides,
        },
    };
}

// Sending was a step these emails asked for, and it stopped being
// anybody's job: a page goes to us once it is a listing
// (20270123090000_the_queue_fills_itself.sql). An email that asks for
// it sends a business looking for a button that is not there.
test("no email asks a business to send its page", () => {
    for (const kind of ["welcome", "setup_nudge_1", "setup_nudge_2"] as const) {
        const unsent = lifecycleEmail(due(kind), "sam@example.com");
        const sent = lifecycleEmail(due(kind, { sent_for_review: true }), "sam@example.com");

        for (const email of [unsent, sent]) {
            if (!email) continue;
            assert.doesNotMatch(email.text, /Send your page for review/, kind);
            assert.doesNotMatch(email.text, /send it to us/i, kind);
            assert.doesNotMatch(email.subject, /Send your page/, kind);
        }
    }
});

test("the nudge counts what is actually left to do", () => {
    const email = lifecycleEmail(
        due("setup_nudge_2", { sent_for_review: true, has_cover: false }),
        "sam@example.com",
    )!;

    assert.match(email.subject, /left before customers can find Little Loaf/);
});

test("the first offer is still named as a step", () => {
    const email = lifecycleEmail(due("welcome", { has_cover: false, has_offer: false }), "sam@example.com")!;

    assert.match(email.text, /Post your first offer/);
});

// ---------------------------------------------------------------------------
// The emails and the dashboard counting the same things
// ---------------------------------------------------------------------------

// A business that has just signed up: nothing done, nothing sent, and
// not paying for anything.
function fresh(kind: LifecycleDue["kind"]): LifecycleDue {
    return {
        ...due(kind),
        hasPro: false,
        approved: false,
        details: {
            ...due(kind).details,
            has_offer: false,
            has_loyalty: false,
            has_poster: false,
            has_logo: false,
            has_description: false,
            has_address: false,
            has_hours: false,
            has_cover: false,
            profile_ready: false,
            sent_for_review: false,
        },
    };
}

test("the welcome names the first things the dashboard asks for", () => {
    const email = lifecycleEmail(fresh("welcome"), "sam@example.com");

    assert.ok(email);
    // The order the dashboard counts them in (lib/setup-steps.ts).
    assert.match(email!.text, /1\. Add your logo/);
    assert.match(email!.text, /2\. Say what you're known for/);
    assert.match(email!.text, /3\. Add your address/);
    // And no claim about how long a list it never showed would take.
    assert.doesNotMatch(email!.text, /15 minutes/);
});

// A page that is a listing has already come to us, so there is never a
// state where it is finished and still waiting on the business. What
// the nudge owes somebody is the list of what is missing.
test("the nudge names what is missing rather than a button to press", () => {
    const notReady = lifecycleEmail(fresh("setup_nudge_2"), "sam@example.com");

    assert.ok(notReady);
    assert.doesNotMatch(notReady!.subject, /one click/);
    assert.doesNotMatch(notReady!.text, /send it to us/i);
    assert.match(notReady!.text, /a little to finish first/);
    assert.match(notReady!.text, /comes to us on its own/);
});

// A loyalty card is part of Pro, and enforce_loyalty_plan will not let a
// Free business start one. Counting it as setup told a business that was
// fully live its customers could not find it.
test("a business on Free is never chased for a card it cannot start", () => {
    const done = {
        ...fresh("setup_nudge_2"),
        approved: true,
        details: {
            ...fresh("setup_nudge_2").details,
            has_logo: true,
            has_description: true,
            has_address: true,
            has_hours: true,
            has_cover: true,
            profile_ready: true,
            sent_for_review: true,
            has_offer: true,
            has_poster: true,
        },
    };

    // Nothing left to say, so nothing is said.
    assert.equal(lifecycleEmail(done, "sam@example.com"), null);

    // On Pro the card is a real next step, and is named.
    const onPro = lifecycleEmail({ ...done, hasPro: true }, "sam@example.com");
    assert.ok(onPro);
    assert.match(onPro!.text, /loyalty card/i);
});

test("no setup email sends anybody to a till", () => {
    const kinds: LifecycleDue["kind"][] = [
        "welcome",
        "setup_nudge_1",
        "setup_nudge_2",
        "loyalty_pitch",
        "founding_places",
        "results",
        "check_in",
    ];

    for (const kind of kinds) {
        const email = lifecycleEmail(fresh(kind), "sam@example.com", { foundingPlacesLeft: 12 });

        if (!email) continue;

        assert.doesNotMatch(email.text, /\btills?\b/i, `${kind} mentions a till`);
    }
});

// ---------------------------------------------------------------------------
// Thin numbers are not a case
// ---------------------------------------------------------------------------

const counts = (over: Partial<LifecycleDue["details"]>) => ({ ...fresh("results").details, ...over });

test("a visit is the only number that proves it worked", () => {
    assert.equal(resultsStrength(counts({ visits: 1 })), "visits");
    assert.equal(resultsStrength(counts({ loyalty_members: 4 })), "interest");
    assert.equal(resultsStrength(counts({ followers: 2 })), "interest");
    assert.equal(resultsStrength(counts({ claims: 1 })), "interest");

    // Anonymous by design, and nobody renewed over a page view.
    assert.equal(resultsStrength(counts({ views: 612, qr_scans: 147 })), "nothing");
});

// The email this started from: "Quayside Coffee has had 3 page views"
// is a month of evidence that nothing happened, in our own words, just
// before asking for a card.
test("a business with nothing but page views is not read its page views", () => {
    const email = lifecycleEmail(
        { ...fresh("results"), details: counts({ views: 3 }) },
        "sam@example.com",
    );

    assert.ok(email);
    assert.match(email!.subject, /Getting .* first customers/);
    assert.doesNotMatch(email!.text, /3 page views/);
    assert.doesNotMatch(email!.text, /has had/);
});

test("interest without a visit is said as interest, not as a result", () => {
    const email = lifecycleEmail(
        { ...fresh("results"), details: counts({ loyalty_members: 9, followers: 4, views: 300 }) },
        "sam@example.com",
    );

    assert.ok(email);
    assert.match(email!.subject, /People are finding/);
    assert.match(email!.text, /9 people are carrying your loyalty card/);
    assert.match(email!.text, /Nobody has been in and used one yet/);
    // The weak numbers stay out of it.
    assert.doesNotMatch(email!.text, /page view/);
});

test("a visit brings the whole list back, page views and all", () => {
    const email = lifecycleEmail(
        { ...fresh("results"), details: counts({ visits: 61, loyalty_members: 41, views: 612 }) },
        "sam@example.com",
    );

    assert.ok(email);
    assert.match(email!.subject, /first two weeks/);
    assert.match(email!.text, /61 customer visits/);
    assert.match(email!.text, /612 page views/);
});

// The worst moment to recite a thin list: the last email before a card
// is charged.
test("the trial-ending email follows the same rule", () => {
    const thin = lifecycleEmail(
        {
            ...fresh("trial_ending"),
            details: counts({ views: 12, qr_scans: 3, trial_end: "2026-12-01T00:00:00Z" }),
        },
        "sam@example.com",
    );

    assert.ok(thin);
    assert.doesNotMatch(thin!.text, /12 page views/);
    assert.match(thin!.text, /hasn't had customers through Promotello yet/);

    const real = lifecycleEmail(
        {
            ...fresh("trial_ending"),
            details: counts({ visits: 18, claims: 9, trial_end: "2026-12-01T00:00:00Z" }),
        },
        "sam@example.com",
    );

    assert.ok(real);
    assert.match(real!.text, /18 customer visits/);
});

// The end of a trial is now two different events: a card on it is
// charged, and a trial started without one simply stops
// (docs/LAUNCH-FUNNEL.md). Telling somebody their plan carries on
// automatically when it is about to lapse is the worst email we could
// send, so each branch is pinned.
test("a trial with a card is told it carries on", () => {
    const email = lifecycleEmail(
        due("trial_ending", { trial_end: "2027-01-20T00:00:00Z", trial_has_card: true, visits: 4 }),
        "sam@example.com",
    )!;

    assert.match(email.subject, /trial ends on 20 January/);
    assert.match(email.text, /carries on automatically/);
    assert.ok(!email.text.includes("no card"));
});

test("a trial with no card is asked for one, and told what stops", () => {
    const email = lifecycleEmail(
        due("trial_ending", { trial_end: "2027-01-20T00:00:00Z", trial_has_card: false, visits: 4 }),
        "sam@example.com",
    )!;

    assert.match(email.subject, /Keep Little Loaf on Pro/);
    assert.match(email.text, /nothing is charged and nothing will be/);
    assert.match(email.text, /Add a card and keep it/);

    // The promise that would now be false.
    assert.ok(!email.text.includes("carries on automatically"));

    // And what Free actually costs them, which is the argument for the
    // card. It must not overstate: the stamp card keeps working.
    assert.match(email.text, /stamp card keeps working/);
});

// Every trial started before the flag existed took a card, so a payload
// without it must read as one that did.
test("an older payload with no flag reads as a trial with a card", () => {
    const email = lifecycleEmail(
        due("trial_ending", { trial_end: "2027-01-20T00:00:00Z", visits: 1 }),
        "sam@example.com",
    )!;

    assert.match(email.text, /carries on automatically/);
});

// The dashboard hands back the offer and the card from their preview
// email the moment they claim (20270110090000). The welcome is the
// other thing they get that day, so it names the same two things rather
// than describing a blank page (docs/LAUNCH-FUNNEL.md).
test("the welcome names the offer and the card we drew for them", () => {
    const email = lifecycleEmail(
        due("welcome", {
            has_offer: false,
            has_loyalty: false,
            sample_offer: "2 for 1 on coffee",
            sample_reward: "a free flat white",
            sample_stamps: 9,
        }),
        "sam@example.com",
    )!;

    // The greeting first: leading with the sample reads like a system
    // notice, and the pieces are written lowercase so either can come
    // first, then capitalised once joined.
    assert.match(email.text, /Thanks for signing up\. Your offer, “2 for 1 on coffee”/);
    assert.match(email.text, /your loyalty card \(9 stamps, then a free flat white\) are waiting/);
    assert.match(email.text, /Nothing is live yet/);
});

// A cold sign-up was never a preview, so there is nothing to name and
// the welcome reads exactly as it did.
test("a welcome with nothing to hand back is the old welcome", () => {
    const email = lifecycleEmail(due("welcome", { has_offer: false, has_loyalty: false }), "sam@example.com")!;

    assert.ok(!email.text.includes("waiting on your dashboard"));
    assert.match(email.text, /Thanks for signing up/);
});

// One rule for both surfaces: a half they have already done drops out
// of the email exactly as it drops off the dashboard.
test("a half they have already done is not offered back", () => {
    const email = lifecycleEmail(
        due("welcome", {
            has_offer: true,
            has_loyalty: false,
            sample_offer: "2 for 1 on coffee",
            sample_reward: "a free flat white",
            sample_stamps: 9,
        }),
        "sam@example.com",
    )!;

    assert.ok(!email.text.includes("2 for 1 on coffee"));
    assert.match(email.text, /Your loyalty card \(9 stamps/, "capitalised when it leads");
    assert.match(email.text, /is waiting on your dashboard/, "one thing, so singular");
    assert.match(email.text, /it opens filled in/, "and singular all the way through");
});
