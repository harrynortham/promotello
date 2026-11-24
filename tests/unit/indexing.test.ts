import assert from "node:assert/strict";
import { test } from "node:test";

import { ENOUGH_DESCRIPTION, whyNotIndexed, worthIndexing } from "@/lib/indexing";

const long = "A corner pub on Gloucester Road with six cask lines, a back garden that fills up the moment it stops raining, and a quiz on Tuesdays.";
const short = "A corner pub on Gloucester Road.";

test("a claimed business is indexed however short it kept its page", () => {
    assert.equal(worthIndexing({ unclaimed: false, description: short, hasHours: false }), true);
    assert.equal(worthIndexing({ unclaimed: false, description: null, hasHours: false }), true);
});

test("an unclaimed page needs both the words and the hours", () => {
    assert.equal(worthIndexing({ unclaimed: true, description: long, hasHours: true }), true);
    assert.equal(worthIndexing({ unclaimed: true, description: long, hasHours: false }), false);
    assert.equal(worthIndexing({ unclaimed: true, description: short, hasHours: true }), false);
    assert.equal(worthIndexing({ unclaimed: true, description: null, hasHours: true }), false);
});

test("whitespace is not a description", () => {
    const padded = " ".repeat(ENOUGH_DESCRIPTION + 10);

    assert.equal(worthIndexing({ unclaimed: true, description: padded, hasHours: true }), false);
});

test("it says what is missing, for the admin page", () => {
    assert.equal(
        whyNotIndexed({ unclaimed: true, description: short, hasHours: false }),
        "a longer description and opening hours",
    );
    assert.equal(whyNotIndexed({ unclaimed: true, description: long, hasHours: false }), "opening hours");
    assert.equal(whyNotIndexed({ unclaimed: true, description: long, hasHours: true }), null);
    assert.equal(whyNotIndexed({ unclaimed: false, description: null, hasHours: false }), null);
});

// The Blue Lagoon's description was 30 characters on the day this was
// written, and Google should not be asked to rank that.
test("the live example that prompted this", () => {
    assert.equal(
        worthIndexing({ unclaimed: true, description: "A cafe and bar on Gloucester Rd", hasHours: true }),
        false,
    );
});
