import assert from "node:assert/strict";
import { test } from "node:test";

import { headlineFor, kindFromHeadline } from "@/lib/offer-kinds";

// Every distinct headline live on 6 November 2026, so the backfill can
// be checked against the real thing rather than invented examples.
const live: [string, string][] = [
    ["Free coffee", "freebie"],
    ["Free pastry", "freebie"],
    ["Free shoe hire", "freebie"],
    ["Free late checkout", "freebie"],
    ["Free repotting", "freebie"],
    ["10% off", "percent_off"],
    ["15% off", "percent_off"],
    ["20% off", "percent_off"],
    ["50% off", "percent_off"],
    ["20% offer", "percent_off"],
    ["£5 off", "money_off"],
    ["£10 off", "money_off"],
    ["£15 off", "money_off"],
    ["£1 off pints", "money_off"],
    ["£5 off pp", "money_off"],
    ["£1 cones", "fixed_price"],
    ["£5 tickets", "fixed_price"],
    ["£8 beard trim", "fixed_price"],
    ["2 for £15", "multi_buy"],
    ["2 for £20", "multi_buy"],
    ["3rd half price", "other"],
    ["Flight for £8", "other"],
];

test("the backfill reads the live headlines the way a person would", () => {
    for (const [headline, expected] of live) {
        assert.equal(kindFromHeadline(headline).kind, expected, headline);
    }
});

test("the number comes out with the kind", () => {
    assert.deepEqual(kindFromHeadline("20% off"), { kind: "percent_off", value: 20 });
    assert.deepEqual(kindFromHeadline("20% offer"), { kind: "percent_off", value: 20 });
    assert.deepEqual(kindFromHeadline("£7.50 off"), { kind: "money_off", value: 7.5 });
    assert.deepEqual(kindFromHeadline("£8 beard trim"), { kind: "fixed_price", value: 8 });
    assert.equal(kindFromHeadline("Free coffee").value, null);
});

test("money off a named thing is not a price", () => {
    // The order of the rules is the whole reason this is right.
    assert.equal(kindFromHeadline("£1 off pints").kind, "money_off");
    assert.equal(kindFromHeadline("£1 pints").kind, "fixed_price");
});

test("a headline is suggested, and reads like the ones businesses write", () => {
    assert.equal(headlineFor("percent_off", 20), "20% off");
    assert.equal(headlineFor("money_off", 5), "£5 off");
    assert.equal(headlineFor("money_off", 7.5), "£7.50 off");
    assert.equal(headlineFor("fixed_price", 8), "£8");

    // Two numbers, or none: the business writes these.
    assert.equal(headlineFor("multi_buy", 2), "");
    assert.equal(headlineFor("freebie", null), "");
    assert.equal(headlineFor("other", 3), "");
});

test("a suggestion round-trips back to its kind", () => {
    for (const [kind, value] of [["percent_off", 20], ["money_off", 5], ["fixed_price", 8]] as const) {
        const headline = headlineFor(kind, value);
        assert.deepEqual(kindFromHeadline(headline), { kind, value }, headline);
    }
});
