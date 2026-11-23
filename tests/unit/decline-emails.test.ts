import assert from "node:assert/strict";
import { test } from "node:test";

import {
    businessReviewedEmail,
    offerEditReviewedEmail,
    offerReviewedEmail,
} from "@/lib/business-review-emails";
import {
    BUSINESS_REASONS,
    BUSINESS_SUSPENSIONS,
    findReason,
    OFFER_REASONS,
    OFFER_SUSPENSIONS,
    type ReviewAction,
    type ReviewOf,
    type ReviewReason,
} from "@/lib/review-reasons";

// What a business reads when something is turned down.
//
// All three used to list what the reason might have been and ask them to
// reply. These check the three things that replaced that: the cause, the
// note written about them, and somewhere to go that isn't a form.

const business = { id: "b-1", name: "Dublin Pub", slug: "dublin-pub" };
const offer = { id: "o-1", title: "Free pastry", slug: "free-pastry", business: { id: "b-1", name: "Dublin Pub" } };
const edit = { id: "o-1", businessId: "b-1", title: "Free pastry", slug: "free-pastry", business: "Dublin Pub" };

test("a declined business is told the cause and what to change", () => {
    const reason = findReason("business", "rejected", "thin-profile")!;
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

// Every code, not one of each. The tests above prove the wiring for a
// single reason, and the reason lists have their own tests for shape —
// but nothing held the two together, so a reason could be added and
// reach nobody. declineParts() drops any paragraph equal to the fix,
// which is the kind of thing that eats a cause silently.
test("every reason reaches the business in the email", () => {
    const lists: [ReviewOf, ReviewAction, ReviewReason[]][] = [
        ["business", "rejected", BUSINESS_REASONS],
        ["offer", "rejected", OFFER_REASONS],
        ["business", "suspended", BUSINESS_SUSPENSIONS],
        ["offer", "suspended", OFFER_SUSPENSIONS],
    ];

    for (const [of_, action, reasons] of lists) {
        for (const reason of reasons) {
            const note = "What we saw when we looked.";
            const review = { reason: reason.code, note };
            const email =
                of_ === "business"
                    ? businessReviewedEmail(business, action, "owner@example.com", review)
                    : offerReviewedEmail(offer, action, "owner@example.com", review);

            const where = `${of_} ${action} ${reason.code}`;

            // "Something else" has no stock sentence on purpose: the
            // note is the whole message, which is why it is required.
            if (reason.says !== "") {
                assert.ok(email.text.includes(reason.says), `${where}: the cause is missing`);
            }

            assert.ok(email.text.includes(note), `${where}: the note is missing`);
            assert.ok(email.text.includes(reason.fix), `${where}: what to do about it is missing`);
        }
    }
});

test("a declined offer goes to its own editor, because saving re-queues it", () => {
    const reason = findReason("offer", "rejected", "hard-to-check")!;
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

// Taken down after it was live. The message has one job beyond saying
// why: making it plain that nothing of theirs is gone, because a
// business that thinks it has lost its customers cancels rather than
// replies.
test("a suspended business is told what it still has", () => {
    const reason = findReason("business", "suspended", "complaints")!;
    const email = businessReviewedEmail(business, "suspended", "owner@example.com", {
        reason: "complaints",
        note: "Two people said the 2-for-1 wasn't given on a Saturday.",
    });

    assert.equal(email.subject, "Dublin Pub is off Promotello for now");
    assert.ok(email.text.includes(reason.says));
    assert.ok(email.text.includes("Two people said"));
    assert.match(email.text, /Nothing is deleted/);
    assert.match(email.text, /stamps are all exactly as you left them/);
    assert.ok(email.html.includes("help#suspended"), "the article about getting back");

    // What to change is the wrong label for something that was fine
    // yesterday.
    assert.ok(email.text.includes("What puts it back"));
    assert.ok(!email.text.includes("What to change"));
});

test("a suspended offer says claimed vouchers still work", () => {
    const email = offerReviewedEmail(offer, "suspended", "owner@example.com", {
        reason: "no-longer-available",
        note: null,
    });

    assert.equal(email.subject, "Your offer is off the site: Free pastry");
    assert.match(email.text, /Vouchers people already claimed still work/);
    assert.ok(email.html.includes("/business/b-1/offers/o-1/edit"));
});

// Coming back is not the same event as arriving.
test("a restored business is not told to print its first poster", () => {
    const back = businessReviewedEmail(business, "approved", "owner@example.com", {
        previous: "suspended",
    });

    assert.equal(back.subject, "Dublin Pub is back on Promotello");
    assert.ok(!back.text.includes("print your QR poster"));
    assert.match(back.text, /kept their stamps/);

    const first = businessReviewedEmail(business, "approved", "owner@example.com");
    assert.equal(first.subject, "Dublin Pub is live on Promotello");
    assert.match(first.text, /print your QR poster/);
});

test("a restored offer says the printed codes work again", () => {
    const back = offerReviewedEmail(offer, "approved", "owner@example.com", {
        previous: "suspended",
    });

    assert.equal(back.subject, "Your offer is back: Free pastry");
    assert.match(back.text, /without reprinting anything/);

    assert.equal(
        offerReviewedEmail(offer, "approved", "owner@example.com").subject,
        "Your offer is live: Free pastry",
    );
});
