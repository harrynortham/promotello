import assert from "node:assert/strict";
import { test } from "node:test";

import {
    firstUnfinished,
    isSetupStepId,
    missingBeforeReview,
    readyForReview,
    setupFinished,
    setupProgress,
    setupSteps,
    type SetupState,
} from "@/lib/setup-steps";

const nothing: SetupState = {
    hasLogo: false,
    hasDescription: false,
    hasAddress: false,
    hasHours: false,
    hasCover: false,
    sentForReview: false,
    hasOffer: false,
};

const everything: SetupState = {
    hasLogo: true,
    hasDescription: true,
    hasAddress: true,
    hasHours: true,
    hasCover: true,
    sentForReview: true,
    hasOffer: true,
};

test("the page comes before the offer that points at it", () => {
    const order = setupSteps(nothing).map((step) => step.id);

    // No "review" step: a page goes to us when it has the three things
    // that make a listing, not when somebody presses something
    // (20270123090000_the_queue_fills_itself.sql).
    assert.deepEqual(order, ["logo", "description", "address", "hours", "cover", "offer"]);
    assert.equal(
        (order as string[]).includes("review"),
        false,
        "nothing is sent by hand any more",
    );
});

test("a page we built arrives part-finished, and starts at what is left", () => {
    // What creating a preview fills in: a description, an address, and
    // whatever picture we found.
    const claimed = setupSteps({ ...nothing, hasDescription: true, hasAddress: true, hasLogo: true });

    assert.equal(firstUnfinished(claimed), "hours");
    assert.equal(setupProgress(claimed).done, 3);
    assert.equal(setupProgress(claimed).percent, 50);
});

test("nothing left means nothing to show", () => {
    const done = setupSteps(everything);

    assert.equal(setupFinished(done), true);
    assert.equal(firstUnfinished(done), null);
    assert.equal(setupProgress(done).percent, 100);
});

test("what is still missing is named, rather than silently holding the page", () => {
    const missing = missingBeforeReview(setupSteps({ ...everything, hasHours: false, hasAddress: false }));

    assert.deepEqual(missing.map((step) => step.id), ["address", "hours"]);
    // The offer comes after sending, so it is never in the way of it.
    assert.equal(missingBeforeReview(setupSteps({ ...everything, hasOffer: false })).length, 0);
});

// Both steps offer "I'll add it later", and the page has a real answer
// without either — a monogram, and the cover's own empty state. A skip
// the send button then refuses to honour is worse than no skip: a
// business with no logo to hand could not go live at all.
test("the logo and the cover photo can be left for later, and the send still works", () => {
    const withoutEither = { ...everything, hasLogo: false, hasCover: false };

    assert.deepEqual(missingBeforeReview(setupSteps(withoutEither)), []);
    assert.equal(readyForReview(withoutEither), true);

    // The three that make it a listing still do block.
    assert.equal(readyForReview({ ...everything, hasDescription: false }), false);
    assert.equal(readyForReview({ ...everything, hasAddress: false }), false);
    assert.equal(readyForReview({ ...everything, hasHours: false }), false);

    // And they are still steps: left for later, not taken off the list.
    const list = setupSteps(withoutEither);
    assert.equal(list.some((step) => step.id === "logo" && !step.done), true);
    assert.equal(list.some((step) => step.id === "cover" && !step.done), true);
});

test("only the steps that exist can be asked for", () => {
    assert.equal(isSetupStepId("cover"), true);
    assert.equal(isSetupStepId("billing"), false);
    assert.equal(isSetupStepId(null), false);
});
