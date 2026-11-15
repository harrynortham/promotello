import assert from "node:assert/strict";
import { test } from "node:test";

import { NO_STARTER, readStarterRow, starterToShow } from "@/lib/starter";

// What we put in their preview email, handed back to them on the first
// screen after claiming. Until this existed, sample_offer and
// sample_reward were decoration: the business said yes to a specific
// offer and a specific card, then met a blank form.

test("the row becomes the two lines, trimmed", () => {
    const starter = readStarterRow({
        sample_offer: "  2 for 1 on coffee  ",
        sample_reward: " A free flat white ",
        sample_stamps: 9,
    });

    assert.deepEqual(starter, { offer: "2 for 1 on coffee", reward: "A free flat white", stamps: 9 });
});

test("a single row comes back in an array, which is how the RPC returns it", () => {
    const starter = readStarterRow([
        { sample_offer: "20% off", sample_reward: "A free cut", sample_stamps: 6 },
    ]);

    assert.equal(starter.offer, "20% off");
    assert.equal(starter.stamps, 6);
});

// A business that signed up cold was never a preview, so there is no row
// and nothing should be offered.
test("no preview means nothing to hand back", () => {
    assert.deepEqual(readStarterRow(null), NO_STARTER);
    assert.deepEqual(readStarterRow([]), NO_STARTER);
    assert.deepEqual(readStarterRow({}), NO_STARTER);
});

test("blank columns are nothing, not an empty prompt", () => {
    const starter = readStarterRow({ sample_offer: "   ", sample_reward: "", sample_stamps: null });

    assert.equal(starter.offer, null);
    assert.equal(starter.reward, null);
    assert.equal(starter.stamps, null);
});

// Outside the builder's own range it was never a card we would have
// drawn, so it falls back rather than putting an impossible number in
// front of them.
test("a stamp count the builder can't hold is dropped", () => {
    for (const stamps of [0, 2, 21, 100, "nine", null]) {
        assert.equal(readStarterRow({ sample_offer: "x", sample_reward: "y", sample_stamps: stamps }).stamps, null);
    }

    assert.equal(readStarterRow({ sample_stamps: 3 }).stamps, 3);
    assert.equal(readStarterRow({ sample_stamps: 20 }).stamps, 20);
});

const starter = { offer: "2 for 1 on coffee", reward: "A free flat white", stamps: 9 };

test("both halves are offered to a business that has neither", () => {
    const shown = starterToShow(starter, { hasOffer: false, hasLoyalty: false });

    assert.equal(shown.offer, "2 for 1 on coffee");
    assert.deepEqual(shown.card, { reward: "A free flat white", stamps: 9 });
    assert.ok(shown.any);
});

// Once they have written their own, ours is a worse version of a thing
// they have already done, and a prompt that keeps showing reads as us
// not noticing.
test("a half they have done themselves stops being offered", () => {
    assert.equal(starterToShow(starter, { hasOffer: true, hasLoyalty: false }).offer, null);
    assert.equal(starterToShow(starter, { hasOffer: false, hasLoyalty: true }).card, null);
    assert.ok(!starterToShow(starter, { hasOffer: true, hasLoyalty: true }).any);
});

test("nothing is offered when there was no preview", () => {
    const shown = starterToShow(NO_STARTER, { hasOffer: false, hasLoyalty: false });

    assert.equal(shown.offer, null);
    assert.equal(shown.card, null);
    assert.ok(!shown.any);
});

// A preview with a reward but no stamp count still draws a card: the
// reward is the part that was promised, and nine is what the builder
// would have shown anyway.
test("a reward with no usable stamp count still makes a card", () => {
    const shown = starterToShow(
        { offer: null, reward: "A free flat white", stamps: null },
        { hasOffer: false, hasLoyalty: false },
    );

    assert.deepEqual(shown.card, { reward: "A free flat white", stamps: 9 });
});
