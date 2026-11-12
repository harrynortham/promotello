import assert from "node:assert/strict";
import { test } from "node:test";

import {
    businessApproved,
    businessRejected,
    newLoyaltyCard,
    newOfferFromFollowed,
    offerApproved,
    offerEditApproved,
    offerEditRejected,
    offerFullyClaimed,
    offerLowStock,
    offerRejected,
    voucherIssued,
    type NotificationContent,
} from "@/lib/notifications";

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
