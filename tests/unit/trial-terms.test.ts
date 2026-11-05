import assert from "node:assert/strict";
import { test } from "node:test";

import { TRIAL_DAYS } from "@/lib/billing";
import { trialTerms } from "@/lib/business-lifecycle";

const wordings = Object.values(trialTerms);

test("no two emails say the trial terms the same way", () => {
    assert.equal(new Set(wordings).size, wordings.length, "a wording is used twice");

    // Not just different punctuation: the opening of each should differ,
    // which is the part someone reading four emails notices.
    const openings = wordings.map((line) => line.split(/[.,—]/)[0].trim());
    assert.equal(new Set(openings).size, openings.length, `openings repeat: ${openings.join(" | ")}`);
});

test("each one still says all four things", () => {
    for (const [name, line] of Object.entries(trialTerms)) {
        assert.match(line, new RegExp(`${TRIAL_DAYS} days`), `${name}: how long it is free`);
        assert.match(line, /card/i, `${name}: that a card is taken`);
        assert.match(line, /charge|leaves it/i, `${name}: when the charge happens`);
        assert.match(line, /cancel|stop/i, `${name}: that it can be stopped`);
    }
});
