import assert from "node:assert/strict";
import { test } from "node:test";

import { FOUNDING_TRIAL_DAYS, TRIAL_DAYS } from "@/lib/billing";
import { trialTerms } from "@/lib/business-lifecycle";

const wordings = Object.values(trialTerms);

test("no two emails say the trial terms the same way", () => {
    assert.equal(new Set(wordings).size, wordings.length, "a wording is used twice");

    // Not just different punctuation: the opening of each should differ,
    // which is the part someone reading four emails notices.
    const openings = wordings.map((line) => line.split(/[.,—]/)[0].trim());
    assert.equal(new Set(openings).size, openings.length, `openings repeat: ${openings.join(" | ")}`);
});

// These used to have to say a card was taken at the start. A trial
// takes no card now (docs/LAUNCH-FUNNEL.md), and the thing that must
// never go missing is the opposite: that starting one costs nothing and
// commits nothing.
test("each one still says all three things", () => {
    for (const [name, line] of Object.entries(trialTerms)) {
        // A founding place carries the longer trial, so the sentence
        // beside it says ninety rather than thirty.
        const days = name === "founding" ? FOUNDING_TRIAL_DAYS : TRIAL_DAYS;

        assert.match(line, new RegExp(`${days} days`), `${name}: how long it is free`);
        assert.match(line, /no card|without a card/i, `${name}: that starting takes no card`);
        assert.match(line, /stop|keep it|carry on/i, `${name}: what happens at the end`);
    }
});

// The old promise, which would now be a lie in Checkout.
test("none of them still asks for a card up front", () => {
    for (const [name, line] of Object.entries(trialTerms)) {
        assert.ok(!/we ask for a card|takes a card|a card to begin/i.test(line), `${name}`);
    }
});
