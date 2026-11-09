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
