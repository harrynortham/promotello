import assert from "node:assert/strict";
import { test } from "node:test";

import { cardState, groupCards, groupOf, liveCardsFirst, sortCards } from "@/lib/loyalty-state";

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

// A wallet with more than a couple of cards in it.
const card = (over: Partial<Parameters<typeof groupOf>[0]> = {}) => ({
    stamps: 0,
    stampsRequired: 10,
    ...over,
});

test("a card falls into the group somebody would look for it in", () => {
    assert.equal(groupOf(card({ stamps: 3 })), "collecting");
    assert.equal(groupOf(card({ stamps: 3, closed: true })), "collecting");
    assert.equal(groupOf(card({ stamps: 10 })), "ready");
    assert.equal(groupOf(card({ stamps: 22 })), "ready");
    assert.equal(groupOf(card({ stamps: 2, finished: true })), "finished");
});

test("the card closest to a reward is the one worth getting out", () => {
    const { collecting } = groupCards([
        { id: "a", ...card({ stamps: 1 }) },
        { id: "b", ...card({ stamps: 9 }) },
        { id: "c", ...card({ stamps: 4, stampsRequired: 5 }) },
    ]);

    assert.deepEqual(collecting.map((one) => one.id), ["b", "c", "a"]);
});

test("two cards the same distance along are ordered by the shop they were last in", () => {
    const { collecting } = groupCards([
        { id: "older", ...card({ stamps: 5, lastStampedAt: "2026-01-01T00:00:00Z" }) },
        { id: "never", ...card({ stamps: 5 }) },
        { id: "newer", ...card({ stamps: 5, lastStampedAt: "2026-06-01T00:00:00Z" }) },
    ]);

    assert.deepEqual(collecting.map((one) => one.id), ["newer", "older", "never"]);
});

test("rewards to claim come in the order they were last stamped", () => {
    const { ready } = groupCards([
        { id: "last-week", ...card({ stamps: 10, lastStampedAt: "2026-06-01T00:00:00Z" }) },
        { id: "today", ...card({ stamps: 10, lastStampedAt: "2026-06-08T00:00:00Z" }) },
    ]);

    assert.deepEqual(ready.map((one) => one.id), ["today", "last-week"]);
});

test("finished cards are history, newest first", () => {
    const { finished, collecting, ready } = groupCards([
        { id: "old", ...card({ finished: true, finishedAt: "2026-01-01T00:00:00Z" }) },
        { id: "recent", ...card({ finished: true, finishedAt: "2026-07-01T00:00:00Z" }) },
        { id: "live", ...card({ stamps: 2 }) },
    ]);

    assert.deepEqual(finished.map((one) => one.id), ["recent", "old"]);
    assert.deepEqual(collecting.map((one) => one.id), ["live"]);
    assert.deepEqual(ready, []);
});

test("the wallet as one list runs rewards, then closest, then done with", () => {
    const list = sortCards([
        { id: "finished", ...card({ finished: true, finishedAt: "2026-05-01T00:00:00Z" }) },
        { id: "half", ...card({ stamps: 5 }) },
        { id: "full", ...card({ stamps: 10 }) },
        { id: "nearly", ...card({ stamps: 9 }) },
    ]);

    assert.deepEqual(list.map((one) => one.id), ["full", "nearly", "half", "finished"]);
});
