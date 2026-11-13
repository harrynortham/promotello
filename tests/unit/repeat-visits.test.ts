import assert from "node:assert/strict";
import { test } from "node:test";

import {
    monthsLabel,
    readRepeatVisits,
    repeatVisitSentence,
    returnRate,
    type RepeatVisits,
} from "@/lib/repeat-visits";

// The roadmap's own example: 41 first-timers, all of them sent.
const report = (over: Partial<RepeatVisits> = {}): RepeatVisits => ({
    months: 3,
    newCustomers: 41,
    returned: 12,
    regulars: 5,
    sentByPromotello: 41,
    sentReturned: 12,
    sentRegulars: 5,
    customers: 60,
    visits: 180,
    byMonth: [],
    ...over,
});

test("the sentence is the one on the roadmap", () => {
    assert.equal(
        repeatVisitSentence(report()),
        "Promotello sent you 41 first-time customers in the last 3 months. 12 came back. 5 are now regulars.",
    );
});

// The three numbers have to be about the same people. Counting who
// came back across everybody who walked in, while claiming only the
// ones we sent, reads as more of them coming back than we sent.
test("who came back is counted among the people we sent, not everybody", () => {
    const said = repeatVisitSentence(
        report({ newCustomers: 8, returned: 7, regulars: 3, sentByPromotello: 6, sentReturned: 5, sentRegulars: 2 }),
    );

    assert.equal(said, "Promotello sent you 6 first-time customers in the last 3 months. 5 came back. 2 are now regulars.");
});

test("one of anything reads as one", () => {
    assert.equal(
        repeatVisitSentence(
            report({ newCustomers: 1, sentByPromotello: 1, sentReturned: 1, sentRegulars: 1, returned: 1, regulars: 1 }),
        ),
        "Promotello sent you 1 first-time customer in the last 3 months. 1 came back. 1 is now a regular.",
    );
});

// The claim is only ever as big as the numbers: a first visit we cannot
// say we sent is still a first visit, and is counted as one.
test("with nobody attributed, it counts the first visits and claims nothing", () => {
    const said = repeatVisitSentence(
        report({ newCustomers: 4, returned: 0, regulars: 0, sentByPromotello: 0, sentReturned: 0, sentRegulars: 0 }),
    );

    assert.equal(said, "4 customers came in for the first time in the last 3 months. None of them has been back yet.");
    assert.ok(!said.includes("Promotello sent"));
});

test("an empty window says so rather than printing noughts", () => {
    const said = repeatVisitSentence(
        report({ newCustomers: 0, returned: 0, regulars: 0, sentByPromotello: 0, sentReturned: 0, sentRegulars: 0 }),
    );

    assert.match(said, /^Nobody's first visit landed in the last 3 months\./);
});

test("the window is named the way somebody would say it", () => {
    assert.equal(monthsLabel(1), "this month");
    assert.equal(monthsLabel(3), "the last 3 months");
    assert.equal(monthsLabel(12), "this year");
    assert.equal(monthsLabel(24), "the last 2 years");
});

test("the return rate is of the people the sentence is about", () => {
    assert.equal(returnRate(report()), 29);
    assert.equal(
        returnRate(report({ newCustomers: 0, sentByPromotello: 0, sentReturned: 0, sentRegulars: 0 })),
        null,
    );
    // Nobody attributed: it falls back to everybody who came in.
    assert.equal(
        returnRate(report({ newCustomers: 4, returned: 1, sentByPromotello: 0, sentReturned: 0, sentRegulars: 0 })),
        25,
    );
});

test("a report that didn't load takes nothing with it", () => {
    assert.equal(readRepeatVisits(null), null);
    assert.equal(readRepeatVisits("nope"), null);
    assert.equal(readRepeatVisits({}), null);

    assert.deepEqual(
        readRepeatVisits({
            months: 3,
            new_customers: 2,
            returned: 1,
            regulars: 0,
            sent_by_promotello: 1,
            sent_returned: 1,
            sent_regulars: 0,
            customers: 5,
            visits: 9,
            by_month: [{ month: "2026-09-01", new_customers: 2, sent: 1, returned: 1 }],
        }),
        {
            months: 3,
            newCustomers: 2,
            returned: 1,
            regulars: 0,
            sentByPromotello: 1,
            sentReturned: 1,
            sentRegulars: 0,
            customers: 5,
            visits: 9,
            byMonth: [{ month: "2026-09-01", newCustomers: 2, sent: 1, returned: 1 }],
        },
    );
});
