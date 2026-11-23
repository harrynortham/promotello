import assert from "node:assert/strict";
import { test } from "node:test";

import { followReasons } from "@/lib/follow-reasons";

// A poster in a window is a promise made to a customer, in print. The
// first version of this listed a welcome reward and a birthday treat
// for every business that printed one -- both of which need Growth and
// the automation switched on, and neither of which a business on Free
// or Pro can send. The lines now come from what this business can
// actually do today.

const none = { emailsOffers: false, welcome: false, birthday: false };

test("a business on Free promises nothing, because nothing happens", () => {
    // New-offer emails are checked against business_has_pro, so on Free
    // a follower hears nothing at all.
    assert.deepEqual(followReasons(none), []);
});

test("a business on Pro promises the offer emails and not the rewards", () => {
    const reasons = followReasons({ ...none, emailsOffers: true });

    assert.equal(reasons.length, 1);
    assert.match(reasons[0], /new offer/i);
    assert.ok(!reasons.some((line) => /birthday|welcome/i.test(line)));
});

// Growth is not enough on its own: the row has to be switched on, or
// the issuing function never sends one.
test("a Growth business with its automations off promises only the emails", () => {
    const reasons = followReasons({ emailsOffers: true, welcome: false, birthday: false });

    assert.deepEqual(reasons, ["An email whenever we post a new offer"]);
});

test("a Growth business with both on promises all three, soonest first", () => {
    const reasons = followReasons({ emailsOffers: true, welcome: true, birthday: true });

    assert.equal(reasons.length, 3);
    // The welcome lands within seconds of the scan, so it leads.
    assert.match(reasons[0], /welcome/i);
    assert.match(reasons[1], /birthday/i);
    assert.match(reasons[2], /new offer/i);
});

// The poster is the business talking, so it says "we" and "us".
test("every line is in the business's own voice", () => {
    const reasons = followReasons({ emailsOffers: true, welcome: true, birthday: true });

    for (const line of reasons) {
        assert.ok(!/\bthey\b|\btheir\b/i.test(line), `third person: ${line}`);
    }

    assert.ok(reasons.some((line) => /\bwe\b|\bus\b/i.test(line)));
});

// One switched on without the other still reads correctly.
test("a birthday treat alone is not labelled a welcome", () => {
    const reasons = followReasons({ emailsOffers: false, welcome: false, birthday: true });

    assert.equal(reasons.length, 1);
    assert.match(reasons[0], /birthday/i);
});
