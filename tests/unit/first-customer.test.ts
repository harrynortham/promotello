import assert from "node:assert/strict";
import { test } from "node:test";

import { TRIAL_DAYS } from "@/lib/billing";
import { firstCustomerEmail } from "@/lib/first-customer";
import { firstCustomer } from "@/lib/notifications";

// Somebody came.
//
// Every other message a business gets from us is an approval, an expiry,
// a stock alert or a bill. This is the only one that is good news about
// a customer, and it goes once, ever.

const business = { id: "b-1", name: "Dublin Pub" };
const voucher = { kind: "voucher" as const, what: "Free pastry" };
const card = { kind: "card" as const, what: "A free flat white" };

test("the notification says what happened and where to deal with it", () => {
    const claimed = firstCustomer(business, voucher);

    assert.equal(claimed.type, "first_customer");
    assert.equal(claimed.title, "Your first customer at Dublin Pub");
    assert.match(claimed.body!, /claimed “Free pastry”/);
    assert.equal(claimed.href, "/business/b-1/redemptions");

    const joined = firstCustomer(business, card);

    assert.match(joined.body!, /joined your loyalty card/);
    assert.equal(joined.href, "/business/b-1/loyalty");
});

// Once, ever. Both kinds share the key, because the first customer is
// the first customer however they arrived.
test("the key is the business, not the thing they did", () => {
    assert.equal(firstCustomer(business, voucher).dedupeKey, "business:b-1:first-customer");
    assert.equal(
        firstCustomer(business, card).dedupeKey,
        firstCustomer(business, voucher).dedupeKey,
    );
});

test("the email names the offer and says what happens at the counter", () => {
    const email = firstCustomerEmail(business, voucher, false, "owner@example.com");

    assert.equal(email.subject, "Someone just claimed an offer at Dublin Pub");
    assert.match(email.text, /claimed “Free pastry”/);
    assert.match(email.text, /show a code on their phone/);
    assert.ok(email.html.includes("/business/b-1/redemptions"));
});

// The one honest place for the Pro line: they are holding proof the
// thing works, and the card is what turns this visit into the next.
test("a business that hasn't paid is told what brings them back", () => {
    const email = firstCustomerEmail(business, voucher, false, "owner@example.com");

    assert.match(email.text, /stamp card is what brings them back/);
    assert.match(email.text, new RegExp(`free for ${TRIAL_DAYS} days`));
    // The trial takes no card now, and this email must not say otherwise.
    assert.match(email.text, /no card/);
});

test("a business already paying is sold nothing", () => {
    const email = firstCustomerEmail(business, voucher, true, "owner@example.com");

    // "Promotello" contains "Pro", so look for the pitch itself.
    assert.ok(!/part of Pro|Try Pro|rest of Pro/.test(email.text));
    assert.ok(!email.text.includes(`${TRIAL_DAYS} days`));
    assert.match(email.text, /poster where people can see it/);
});

test("a card join leads with the card, not with a pitch for one", () => {
    const email = firstCustomerEmail(business, card, false, "owner@example.com");

    assert.equal(email.subject, "Someone just joined the card at Dublin Pub");
    assert.match(email.text, /joined your loyalty card for “A free flat white”/);
    assert.ok(!email.text.includes("A stamp card is what brings them back"));
    assert.ok(email.html.includes("/business/b-1/loyalty"));
});

// It is sent once and never again, so it must say so rather than read
// like the first of a series.
test("it says it only comes once", () => {
    for (const hasPro of [true, false]) {
        assert.match(firstCustomerEmail(business, voucher, hasPro, "o@example.com").text, /only send it once/);
    }
});
