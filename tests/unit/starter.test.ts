import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_STAMPS, NO_STARTER, readStarterRow, sampleValues, starterToShow } from "@/lib/starter";

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

// What the two write paths put in the columns: building a preview, and
// changing the examples on one already built. They clamped and
// truncated by hand, so a preview could be saved with a stamp count
// readStarterRow would then refuse to read back.

test("the examples are written the way they are read back", () => {
    const values = sampleValues("Free side with any main, before 5pm", "A free main", 9);

    assert.deepEqual(readStarterRow(values), {
        offer: "Free side with any main, before 5pm",
        reward: "A free main",
        stamps: 9,
    });
});

test("a stamp count outside the card builder's range becomes the one we would have drawn", () => {
    assert.equal(sampleValues("Free side", "A free main", 40).sample_stamps, DEFAULT_STAMPS);
    assert.equal(sampleValues("Free side", "A free main", 2).sample_stamps, DEFAULT_STAMPS);
    assert.equal(sampleValues("Free side", "A free main", 9.5).sample_stamps, DEFAULT_STAMPS);
    assert.equal(sampleValues("Free side", "A free main", Number.NaN).sample_stamps, DEFAULT_STAMPS);
});

// The offer is the poster headline as well as the card title, and the
// column is 80 characters: a longer one is cut rather than refused.
test("an offer past the column length is cut to it", () => {
    const values = sampleValues("x".repeat(200), "y".repeat(200), 9);

    assert.equal(values.sample_offer.length, 80);
    assert.equal(values.sample_reward.length, 60);
});
