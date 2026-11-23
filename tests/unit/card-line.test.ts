import assert from "node:assert/strict";
import { test } from "node:test";

import { cardLine } from "@/lib/loyalty-state";

// "8 stamps, then a free coffee" left the first half doing two jobs:
// is eight what I have, or what I need? Both verbs are said now.
test("a card says what to do and what you get", () => {
    assert.equal(cardLine(8, "A free coffee"), "Collect 8 stamps, get a free coffee");
});

test("one stamp is a stamp", () => {
    assert.equal(cardLine(1, "A free pastry"), "Collect 1 stamp, get a free pastry");
});

// The reward is written by the business and usually starts capitalised,
// which reads wrong mid-sentence.
test("the reward reads as part of the sentence", () => {
    assert.equal(cardLine(6, "Half off your next cut"), "Collect 6 stamps, get half off your next cut");
});

test("a reward already lower case is left alone", () => {
    assert.equal(cardLine(5, "a free beer"), "Collect 5 stamps, get a free beer");
});
