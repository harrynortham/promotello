import assert from "node:assert/strict";
import { test } from "node:test";

import {
    firstUnfinished,
    isSetupStepId,
    missingBeforeReview,
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

    assert.deepEqual(order, ["logo", "description", "address", "hours", "cover", "review", "offer"]);
});

test("a page we built arrives part-finished, and starts at what is left", () => {
    // What creating a preview fills in: a description, an address, and
    // whatever picture we found.
    const claimed = setupSteps({ ...nothing, hasDescription: true, hasAddress: true, hasLogo: true });

    assert.equal(firstUnfinished(claimed), "hours");
    assert.equal(setupProgress(claimed).done, 3);
    assert.equal(setupProgress(claimed).percent, 43);
});

test("nothing left means nothing to show", () => {
    const done = setupSteps(everything);

    assert.equal(setupFinished(done), true);
    assert.equal(firstUnfinished(done), null);
    assert.equal(setupProgress(done).percent, 100);
});

test("sending the page names what is still missing, rather than refusing", () => {
    const missing = missingBeforeReview(setupSteps({ ...everything, hasHours: false, hasCover: false }));

    assert.deepEqual(missing.map((step) => step.id), ["hours", "cover"]);
    // The offer comes after sending, so it is never in the way of it.
    assert.equal(missingBeforeReview(setupSteps({ ...everything, hasOffer: false })).length, 0);
});

test("only the steps that exist can be asked for", () => {
    assert.equal(isSetupStepId("cover"), true);
    assert.equal(isSetupStepId("billing"), false);
    assert.equal(isSetupStepId(null), false);
});
