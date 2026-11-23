import assert from "node:assert/strict";
import { test } from "node:test";

import { FOUNDING_TRIAL_DAYS, TRIAL_DAYS } from "@/lib/billing";
import { trialTermsFor } from "@/lib/business-lifecycle";

// While founding places remain, every business starting Pro gets the
// longer trial — so every sentence in the sequence has to say so. This
// test used to assert the opposite for three of the four, which is how
// a business came to be told both numbers days apart by the same run of
// emails.
const whileFounding = trialTermsFor(49);
const afterFounding = trialTermsFor(0);

test("no two emails say the trial terms the same way", () => {
    for (const terms of [whileFounding, afterFounding]) {
        const wordings = Object.values(terms);

        assert.equal(new Set(wordings).size, wordings.length, "a wording is used twice");

        // Not just different punctuation: the opening of each should differ,
        // which is the part someone reading four emails notices.
        const openings = wordings.map((line) => line.split(/[.,—]/)[0].trim());
        assert.equal(new Set(openings).size, openings.length, `openings repeat: ${openings.join(" | ")}`);
    }
});

test("the whole sequence quotes one trial length", () => {
    for (const [name, line] of Object.entries(whileFounding)) {
        assert.match(line, new RegExp(`${FOUNDING_TRIAL_DAYS} days`), `${name}: while places are left`);
    }

    for (const [name, line] of Object.entries(afterFounding)) {
        // 'founding' describes the founding place itself, so it keeps the
        // longer figure; the rest drop to the standard trial.
        const days = name === "founding" ? FOUNDING_TRIAL_DAYS : TRIAL_DAYS;

        assert.match(line, new RegExp(`${days} days`), `${name}: once they are gone`);
    }
});

// These used to have to say a card was taken at the start. A trial
// takes no card now (docs/LAUNCH-FUNNEL.md), and the thing that must
// never go missing is the opposite: that starting one costs nothing and
// commits nothing.
test("each one still says all three things", () => {
    for (const [name, line] of Object.entries(whileFounding)) {
        assert.match(line, /\d+ days/, `${name}: how long it is free`);
        assert.match(line, /no card|without a card/i, `${name}: that starting takes no card`);
        assert.match(line, /stop|keep it|carry on/i, `${name}: what happens at the end`);
    }
});

// The old promise, which would now be a lie in Checkout.
test("none of them still asks for a card up front", () => {
    for (const [name, line] of Object.entries(whileFounding)) {
        assert.ok(!/we ask for a card|takes a card|a card to begin/i.test(line), `${name}`);
    }
});
