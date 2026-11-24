import assert from "node:assert/strict";
import { test } from "node:test";

import { ENOUGH_DESCRIPTION, whyNotIndexed, worthIndexing } from "@/lib/indexing";

const long = "A corner pub on Gloucester Road with six cask lines, a back garden that fills up the moment it stops raining, and a quiz on Tuesdays.";
const short = "A corner pub on Gloucester Road.";

test("a claimed business is indexed however short it kept its page", () => {
    assert.equal(worthIndexing({ unclaimed: false, description: short, hasAddress: false }), true);
    assert.equal(worthIndexing({ unclaimed: false, description: null, hasAddress: false }), true);
});

test("an unclaimed page needs words somebody wrote and somewhere to go", () => {
    assert.equal(worthIndexing({ unclaimed: true, description: long, hasAddress: true }), true);
    assert.equal(worthIndexing({ unclaimed: true, description: long, hasAddress: false }), false);
    assert.equal(worthIndexing({ unclaimed: true, description: short, hasAddress: true }), false);
    assert.equal(worthIndexing({ unclaimed: true, description: null, hasAddress: true }), false);
});

test("whitespace is not a description", () => {
    const padded = " ".repeat(ENOUGH_DESCRIPTION + 10);

    assert.equal(worthIndexing({ unclaimed: true, description: padded, hasAddress: true }), false);
});

test("it says what is missing, for the admin page", () => {
    assert.equal(
        whyNotIndexed({ unclaimed: true, description: short, hasAddress: false }),
        "a longer description and an address",
    );
    assert.equal(whyNotIndexed({ unclaimed: true, description: long, hasAddress: false }), "an address");
    assert.equal(whyNotIndexed({ unclaimed: true, description: long, hasAddress: true }), null);
    assert.equal(whyNotIndexed({ unclaimed: false, description: null, hasAddress: false }), null);
});

// Opening hours were a requirement here until the first ten pages went
// looking for some and not one of the eight businesses with a website
// published any. A bar nothing can clear is an off switch, not a gate.
test("hours are not required, because none of these businesses publish them", () => {
    assert.equal(worthIndexing({ unclaimed: true, description: long, hasAddress: true }), true);
});

// The two live pages that should stay out, and the eight that should not.
test("the live examples that decided the threshold", () => {
    const blueLagoon = "A cafe and bar on Gloucester Rd";
    const superStar = "A chip shop on Gloucester Road doing cod, haddock and the usual sides, open into the evening.";

    assert.equal(blueLagoon.length < ENOUGH_DESCRIPTION, true);
    assert.equal(superStar.length < ENOUGH_DESCRIPTION, true);
    assert.equal(worthIndexing({ unclaimed: true, description: blueLagoon, hasAddress: true }), false);
    assert.equal(worthIndexing({ unclaimed: true, description: superStar, hasAddress: true }), false);

    // The Drapers Arms, at 246 characters, is the shape that passes.
    assert.equal(worthIndexing({ unclaimed: true, description: long, hasAddress: true }), true);
});
