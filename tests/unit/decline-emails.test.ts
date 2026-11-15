import assert from "node:assert/strict";
import { test } from "node:test";

import {
    businessReviewedEmail,
    offerEditReviewedEmail,
    offerReviewedEmail,
} from "@/lib/business-review-emails";
import { findReason } from "@/lib/review-reasons";

// What a business reads when something is turned down.
//
// All three used to list what the reason might have been and ask them to
// reply. These check the three things that replaced that: the cause, the
// note written about them, and somewhere to go that isn't a form.

const business = { id: "b-1", name: "Dublin Pub", slug: "dublin-pub" };
const offer = { id: "o-1", title: "Free pastry", slug: "free-pastry", business: { id: "b-1", name: "Dublin Pub" } };
const edit = { id: "o-1", businessId: "b-1", title: "Free pastry", slug: "free-pastry", business: "Dublin Pub" };

test("a declined business is told the cause and what to change", () => {
    const reason = findReason("business", "thin-profile")!;
    const email = businessReviewedEmail(business, "rejected", "owner@example.com", {
        reason: "thin-profile",
        note: "There's a logo and nothing else yet.",
    });

    assert.ok(email.text.includes(reason.says), "the cause");
    assert.ok(email.text.includes("There's a logo and nothing else yet."), "and what we saw");
    assert.ok(email.text.includes(reason.fix), "and what to do about it");

    // Somewhere to act, not only somewhere to ask.
    assert.ok(email.html.includes("/business/b-1/edit"), "straight to the profile");
    assert.ok(email.html.includes("business-declined"), "and the article that explains it");
});

test("a declined offer goes to its own editor, because saving re-queues it", () => {
    const reason = findReason("offer", "hard-to-check")!;
    const email = offerReviewedEmail(offer, "rejected", "owner@example.com", {
        reason: "hard-to-check",
        note: null,
    });

    assert.ok(email.text.includes(reason.says));
    assert.ok(email.text.includes(reason.fix));
    assert.ok(email.html.includes("/business/b-1/offers/o-1/edit"), "the editor, not the public page");
    assert.ok(email.html.includes("offer-declined"));
});

// The button said "Edit the offer" and opened the customer's page.
test("a declined change opens the editor too, and says the offer is still up", () => {
    const email = offerEditReviewedEmail(edit, "rejected", "owner@example.com", {
        reason: "unclear",
        note: null,
    });

    assert.ok(email.html.includes("/business/b-1/offers/o-1/edit"));
    assert.ok(!email.html.includes('href="https://promotello.com/offers/free-pastry"'));
    assert.match(email.text, /still live with the wording we approved/);
});

// Nothing declined before this carried a reason, and there are rows like
// that. The email has to read without one rather than leave a gap.
test("a decline with no reason recorded still reads as a decline", () => {
    const email = offerReviewedEmail(offer, "rejected", "owner@example.com", {});

    assert.match(email.text, /couldn't approve this offer/);
    assert.match(email.text, /Reply to this email/);
    assert.ok(!email.text.includes("undefined"));
    assert.ok(!email.text.includes("What to change"), "nothing to change that we can name");
});

test("an approval is untouched by any of this", () => {
    const yes = offerReviewedEmail(offer, "approved", "owner@example.com");

    assert.equal(yes.subject, "Your offer is live: Free pastry");
    assert.ok(!yes.text.includes("What to change"));
});
