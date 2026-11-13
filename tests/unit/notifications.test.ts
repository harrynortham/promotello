import assert from "node:assert/strict";
import { test } from "node:test";

import {
    adminQueue,
    businessApproved,
    businessRejected,
    newLoyaltyCard,
    newOfferFromFollowed,
    followedBusinessClosed,
    offerApproved,
    offerEditApproved,
    offerExpiring,
    offerEditRejected,
    offerFullyClaimed,
    offerLowStock,
    offerRejected,
    offersPaused,
    paymentFailed,
    posterPointingNowhere,
    rewardReady,
    voucherExpiring,
    voucherIssued,
    type NotificationContent,
} from "@/lib/notifications";
import { daysUntil } from "@/lib/daily-notices";

const business = { id: "b-1", name: "Dublin Pub" };
const offer = { id: "o-1", title: "Free pastry", slug: "dublin-pub-free-pastry", businessId: "b-1" };

// Every builder, so one that is added without a test is obvious.
const everything: [string, NotificationContent][] = [
    ["businessApproved", businessApproved(business)],
    ["businessRejected", businessRejected(business)],
    ["offerApproved", offerApproved(offer)],
    ["offerRejected", offerRejected(offer)],
    ["offerEditApproved", offerEditApproved({ id: "e-1", offerTitle: "Free pastry", businessId: "b-1" })],
    ["offerEditRejected", offerEditRejected({ id: "e-1", offerTitle: "Free pastry", businessId: "b-1" })],
    ["offerFullyClaimed", offerFullyClaimed({ ...offer, maxRedemptions: 100 })],
    ["offerLowStock", offerLowStock({ ...offer, remaining: 3 })],
    [
        "newOfferFromFollowed",
        newOfferFromFollowed({
            id: "o-1",
            title: "Free pastry with any hot drink",
            slug: "dublin-pub-free-pastry",
            discount: "Free pastry",
            businessName: "Dublin Pub",
        }),
    ],
    ["voucherIssued", voucherIssued({ id: "v-1", reward: "a free coffee", businessName: "Dublin Pub" })],
    [
        "newLoyaltyCard",
        newLoyaltyCard({
            id: "c-1",
            programId: "p-2",
            stampsRequired: 8,
            reward: "A free coffee",
            businessName: "Dublin Pub",
        }),
    ],
];

test("a business hears what happened to its page", () => {
    assert.deepEqual(businessApproved(business), {
        type: "business_approved",
        title: "Dublin Pub is live on Promotello",
        body: "Customers can find your page now. Add an offer to give them a reason to come in.",
        href: "/business/b-1",
        businessId: "b-1",
        dedupeKey: "business:b-1:approved",
    });

    const no = businessRejected(business);
    assert.equal(no.title, "We couldn't approve Dublin Pub yet");
    assert.equal(no.href, "/business/contact", "nowhere to go but to us");
    assert.equal(no.dedupeKey, "business:b-1:rejected");
});

test("an offer's answer leads to the offers page either way", () => {
    for (const content of [offerApproved(offer), offerRejected(offer)]) {
        assert.equal(content.href, "/business/b-1/offers");
        assert.equal(content.businessId, "b-1");
    }

    assert.equal(offerApproved(offer).title, "“Free pastry” is live");
    assert.equal(offerApproved(offer).dedupeKey, "offer:o-1:approved");
    assert.equal(offerRejected(offer).dedupeKey, "offer:o-1:rejected");
});

test("an edit is keyed on the edit, so an answer can only land once", () => {
    const edit = { id: "e-1", offerTitle: "Free pastry", businessId: "b-1" };

    // Both decisions share the key: an edit is answered once, and the
    // row that exists is the answer it got.
    assert.equal(offerEditApproved(edit).dedupeKey, "offer-edit:e-1");
    assert.equal(offerEditRejected(edit).dedupeKey, "offer-edit:e-1");
    assert.match(offerEditApproved(edit).title, /are live$/);
    assert.match(offerEditRejected(edit).title, /^We couldn't approve/);
});

test("stock says the number, and counts a single claim properly", () => {
    assert.equal(
        offerFullyClaimed({ ...offer, maxRedemptions: 100 }).title,
        "All 100 of “Free pastry” have been claimed",
    );

    assert.equal(offerLowStock({ ...offer, remaining: 3 }).title, "Only 3 claims left on “Free pastry”");
    assert.equal(offerLowStock({ ...offer, remaining: 1 }).title, "Only 1 claim left on “Free pastry”");

    // The two kinds are told apart, so a low-stock warning doesn't block
    // the sold-out one on the same offer.
    assert.notEqual(
        offerFullyClaimed({ ...offer, maxRedemptions: 100 }).dedupeKey,
        offerLowStock({ ...offer, remaining: 3 }).dedupeKey,
    );
});

test("a follower's notification reads like the card, and belongs to nobody's business", () => {
    const content = newOfferFromFollowed({
        id: "o-1",
        title: "Free pastry with any hot drink",
        slug: "dublin-pub-free-pastry",
        discount: "Free pastry",
        businessName: "Dublin Pub",
    });

    assert.equal(content.title, "Dublin Pub: Free pastry");
    assert.equal(content.body, "Free pastry with any hot drink");
    assert.equal(content.href, "/offers/dublin-pub-free-pastry");
    // A customer following a business is not one of its people, so the
    // row carries no business context for them.
    assert.equal(content.businessId, undefined);
});

test("a voucher says who sent it and where it is", () => {
    const content = voucherIssued({ id: "v-1", reward: "a free coffee", businessName: "Dublin Pub" });

    assert.equal(content.title, "Dublin Pub sent you a free coffee");
    assert.equal(content.href, "/dashboard/redemptions");
    assert.equal(content.dedupeKey, "voucher:v-1");
});

test("every notification is one line, somewhere in this app, told once", () => {
    for (const [name, content] of everything) {
        assert.ok(content.title.length > 0, name);
        assert.ok(!content.title.includes("\n"), `${name}: one line`);
        assert.ok(!/!/.test(content.title), `${name}: no exclamation marks`);

        // The same rule the table enforces: a path in this app, never a
        // protocol-relative URL that would leave it.
        if (content.href) {
            assert.match(content.href, /^\/[^/]/, `${name}: ${content.href}`);
        }

        assert.ok(content.dedupeKey, `${name}: every event is told once`);
    }

    // No two builders share a key for different events.
    const keys = everything.map(([, content]) => content.dedupeKey);
    assert.equal(new Set(keys).size, keys.length - 1, "only the two edit answers share one");
});

// Handed the new card as the old one filled: the card is already theirs,
// so this says where it is rather than asking them to do anything.
test("the new loyalty card names the deal and leads to the card", () => {
    const told = newLoyaltyCard({
        id: "c-1",
        programId: "p-2",
        stampsRequired: 8,
        reward: "A free coffee",
        businessName: "Dublin Pub",
    });

    assert.equal(told.title, "Dublin Pub has a new card: 8 stamps for a free coffee");
    assert.equal(told.href, "/loyalty/p-2");
    // Keyed on the card they were given, so a second stamping attempt
    // on the old card cannot tell them twice.
    assert.equal(told.dedupeKey, "loyalty-card:c-1");
});

// ---------------------------------------------------------------------------
// The ones added when the dot went live
// ---------------------------------------------------------------------------

// Every notification is somebody's interruption, so the words carry the
// thing itself — the number, the name, the date — rather than "something
// has happened, go and look".

test("a downgrade says how many offers went dark, and that they come back", () => {
    const many = offersPaused({ businessId: "b1", paused: 4 });

    assert.equal(many.title, "4 offers have come off the directory");
    assert.match(many.body!, /go back up the moment/);
    assert.equal(many.href, "/business/b1/billing");

    assert.equal(
        offersPaused({ businessId: "b1", paused: 1 }).title,
        "An offer has come off the directory",
    );
});

// One line per downgrade, not one per offer — and a later downgrade
// that pauses a different number is a different thing to say.
test("the paused-offers line is told once per downgrade", () => {
    assert.equal(
        offersPaused({ businessId: "b1", paused: 4 }).dedupeKey,
        offersPaused({ businessId: "b1", paused: 4 }).dedupeKey,
    );
    assert.notEqual(
        offersPaused({ businessId: "b1", paused: 4 }).dedupeKey,
        offersPaused({ businessId: "b1", paused: 2 }).dedupeKey,
    );
});

test("an expiring offer is counted in days, and tomorrow is said as tomorrow", () => {
    assert.equal(
        offerExpiring({ id: "o1", title: "Free pastry", businessId: "b1", days: 3 }).title,
        "“Free pastry” ends in 3 days",
    );
    assert.equal(
        offerExpiring({ id: "o1", title: "Free pastry", businessId: "b1", days: 1 }).title,
        "“Free pastry” ends tomorrow",
    );
    // Today, or a clock that disagrees with itself: still not "in 0 days".
    assert.equal(
        offerExpiring({ id: "o1", title: "Free pastry", businessId: "b1", days: 0 }).title,
        "“Free pastry” ends tomorrow",
    );
});

test("days until an offer ends is counted in whole days, from the UK's today", () => {
    assert.equal(daysUntil("2026-11-16", "2026-11-13"), 3);
    assert.equal(daysUntil("2026-11-14", "2026-11-13"), 1);
    assert.equal(daysUntil("2026-11-13", "2026-11-13"), 0);
    // Across a clock change, which is why this is not hours divided.
    assert.equal(daysUntil("2026-10-26", "2026-10-24"), 2);
});

test("a failed payment says what to do and where, while there is still time", () => {
    const notice = paymentFailed({ id: "b1", name: "Quayside Coffee" });

    assert.match(notice.title, /Quayside Coffee/);
    assert.match(notice.body!, /nothing stops while there's still time/);
    assert.equal(notice.href, "/business/b1/billing");
});

test("a poster pointing nowhere repeats the reason it is dead", () => {
    const notice = posterPointingNowhere({
        id: "q1",
        label: "Front window",
        businessId: "b1",
        problem: "The offer ended on 3 March.",
    });

    assert.match(notice.title, /“Front window”/);
    assert.match(notice.body!, /The offer ended on 3 March\./);
    assert.equal(notice.href, "/business/b1/qr");
});

// A card fills again and again, and each round earns its own reward.
test("a ready reward is told once a round, not once a card", () => {
    const card = { id: "c1", programId: "p1", businessName: "Quayside Coffee", reward: "A free coffee" };

    assert.equal(rewardReady({ ...card, round: 0 }).title, "Your card at Quayside Coffee is full");
    assert.match(rewardReady({ ...card, round: 0 }).body!, /Ask for a free coffee/);
    assert.notEqual(
        rewardReady({ ...card, round: 0 }).dedupeKey,
        rewardReady({ ...card, round: 1 }).dedupeKey,
    );
});

test("an expiring voucher names the shop, because that is the trip", () => {
    const notice = voucherExpiring({
        id: "r1",
        offerTitle: "Free pastry before 10am",
        offerSlug: "quayside-free-pastry",
        businessName: "Quayside Coffee",
    });

    assert.match(notice.title, /Quayside Coffee runs out tomorrow/);
    assert.equal(notice.href, "/offers/quayside-free-pastry");
});

test("a business leaving is said to the people who followed it", () => {
    const notice = followedBusinessClosed({ id: "b1", name: "Quayside Coffee" });

    assert.match(notice.title, /Quayside Coffee has left/);
    assert.equal(notice.href, "/dashboard");
    assert.equal(notice.dedupeKey, "business-closed:b1");
});

test("our own queue is one line a day, with the counts in it", () => {
    const notice = adminQueue({ day: "2026-11-13", businesses: 2, offers: 1, edits: 0, categories: 3 });

    assert.equal(notice.title, "6 things are waiting for you");
    assert.equal(notice.body, "2 businesses to review, 1 offer to review, 3 without a category.");
    assert.equal(notice.dedupeKey, "admin-queue:2026-11-13");

    assert.equal(
        adminQueue({ day: "2026-11-13", businesses: 1, offers: 0, edits: 0, categories: 0 }).title,
        "One thing is waiting for you",
    );
});
