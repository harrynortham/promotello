import assert from "node:assert/strict";
import { test } from "node:test";

import { cardState, liveCardsFirst } from "@/lib/loyalty-state";

test("an open card collects, fills, and is ready", () => {
    assert.equal(cardState({ stamps: 0, stampsRequired: 6 }), "collecting");
    assert.equal(cardState({ stamps: 5, stampsRequired: 6 }), "collecting");
    assert.equal(cardState({ stamps: 6, stampsRequired: 6 }), "reward-ready");
});

// An open card carries on past full into the next round, so it is still
// a card with a reward waiting on it.
test("an open card past full is still a reward waiting", () => {
    assert.equal(cardState({ stamps: 13, stampsRequired: 6 }), "reward-ready");
});

test("a closed card says so while it is filling", () => {
    assert.equal(cardState({ stamps: 0, stampsRequired: 6, closed: true }), "last-lap");
    assert.equal(cardState({ stamps: 5, stampsRequired: 6, closed: true }), "last-lap");
});

test("a full closed card is a reward, not a card to fill again", () => {
    assert.equal(cardState({ stamps: 6, stampsRequired: 6, closed: true }), "reward-ready");
});

// Over-full and closed: every full round it earned is still owed, so it
// reads the same until the last of them is claimed.
test("an over-full closed card is a reward until it is finished", () => {
    assert.equal(cardState({ stamps: 12, stampsRequired: 6, closed: true }), "reward-ready");
    assert.equal(
        cardState({ stamps: 2, stampsRequired: 6, closed: true, finished: true }),
        "finished",
    );
});

test("finished beats everything, whatever is left on the card", () => {
    for (const stamps of [0, 3, 6, 11]) {
        assert.equal(
            cardState({ stamps, stampsRequired: 6, closed: true, finished: true }),
            "finished",
        );
    }
});

test("finished cards sit under the cards still being collected", () => {
    const cards = [
        { id: "done", finished: true },
        { id: "filling", finished: false },
        { id: "also-done", finished: true },
        { id: "ready" },
    ];

    assert.deepEqual(
        [...cards].sort(liveCardsFirst).map((card) => card.id),
        ["filling", "ready", "done", "also-done"],
    );
});
