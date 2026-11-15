import assert from "node:assert/strict";
import { test } from "node:test";

import { lifecycleEmail, type LifecycleDue } from "@/lib/business-lifecycle";

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

test("a page that was never sent is the thing the nudge asks for", () => {
    const email = lifecycleEmail(due("setup_nudge_2"), "sam@example.com")!;

    assert.match(email.subject, /isn't live yet/);
    assert.match(email.text, /Nothing on your page is public until you send it to us/);
    // The old title named the wrong reason they can't be found.
    assert.doesNotMatch(email.subject, /left before customers can find/);
});

test("once it is sent, the nudge counts what is actually left", () => {
    const email = lifecycleEmail(due("setup_nudge_2", { sent_for_review: true, has_cover: false }), "sam@example.com")!;

    assert.match(email.subject, /left before customers can find Little Loaf/);
    assert.doesNotMatch(email.text, /until you send it to us/);
});

test("sending is a setup step until it has been done", () => {
    const unsent = lifecycleEmail(due("welcome"), "sam@example.com")!;
    assert.match(unsent.text, /Send your page for review/);

    const sent = lifecycleEmail(due("welcome", { sent_for_review: true }), "sam@example.com")!;
    assert.doesNotMatch(sent.text, /Send your page for review/);
});

test("with everything else done, the next step is to send it", () => {
    const email = lifecycleEmail(due("setup_nudge_1"), "sam@example.com")!;

    assert.match(email.subject, /Send your page for review/);
});

test("sending comes before writing an offer", () => {
    // Our clock starts when they send, so it runs while they write the
    // offer rather than after it.
    const email = lifecycleEmail(due("welcome", { has_cover: false, has_offer: false }), "sam@example.com")!;

    const review = email.text.indexOf("Send your page for review");
    const offer = email.text.indexOf("Post your first offer");

    assert.ok(review > 0 && offer > review, email.text);
});

// ---------------------------------------------------------------------------
// The emails and the dashboard counting the same things
// ---------------------------------------------------------------------------

// A business that has just signed up: nothing done, nothing sent, and
// not paying for anything.
function fresh(kind: LifecycleDue["kind"], overrides: Partial<LifecycleDue["details"]> = {}): LifecycleDue {
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

// The send button is locked until there is a logo, a description, an
// address, hours and a cover photo. An email promising one click to
// somebody missing those sends them to a button that isn't there.
test("one click is only promised when it really is one click", () => {
    const notReady = lifecycleEmail(fresh("setup_nudge_2"), "sam@example.com");

    assert.ok(notReady);
    assert.doesNotMatch(notReady!.subject, /one click/);
    assert.match(notReady!.text, /a little to finish first/);

    const ready = lifecycleEmail(
        {
            ...fresh("setup_nudge_2"),
            details: {
                ...fresh("setup_nudge_2").details,
                has_logo: true,
                has_description: true,
                has_address: true,
                has_hours: true,
                has_cover: true,
                profile_ready: true,
            },
        },
        "sam@example.com",
    );

    assert.ok(ready);
    assert.match(ready!.subject, /one click would do it/);
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
