import assert from "node:assert/strict";
import { test } from "node:test";

import { ENOUGH_NEIGHBOURS, neighboursLine } from "@/lib/neighbours";

const some = (count: number, names: string[] = []) => ({
    count,
    names,
    areaName: "Gloucester Road",
});

// The line a cold email has been waiting for: a business reading it can
// walk past three of these on the way to work.
test("it names the street and some of the businesses on it", () => {
    const line = neighboursLine(some(12, ["The Folded Page", "Spoke & Chain", "Northside Barbers"]));

    assert.equal(
        line,
        "12 businesses on Gloucester Road are already on here, including The Folded Page, Spoke & Chain and Northside Barbers.",
    );
});

// Two is worse than nothing: it tells the reader the place is empty.
test("it says nothing until there are enough to be worth saying", () => {
    assert.equal(neighboursLine(some(ENOUGH_NEIGHBOURS - 1, ["One", "Two"])), null);
    assert.equal(neighboursLine(some(0)), null);
    assert.equal(neighboursLine(null), null);
});

test("naming all of them is a list, not an example", () => {
    const line = neighboursLine(some(3, ["A", "B", "C"]));

    assert.match(line!, /^3 businesses on Gloucester Road are already on here: A, B and C\.$/);
});

// House style: no comma before the final and (docs/VOICE.md).
test("the list takes no serial comma", () => {
    const line = neighboursLine(some(9, ["A", "B", "C"]));

    assert.ok(!line!.includes("B, and C"));
    assert.match(line!, /A, B and C/);
});

test("at most three are named, however many there are", () => {
    const line = neighboursLine(some(40, ["A", "B", "C", "D", "E"]));

    assert.ok(!line!.includes("D"));
    assert.match(line!, /including A, B and C\./);
});

// An area we could not resolve is not a street anybody can picture.
test("it says nothing without an area to name", () => {
    assert.equal(neighboursLine({ count: 20, names: ["A", "B", "C"], areaName: null }), null);
});

test("one named neighbour reads as a sentence", () => {
    assert.equal(
        neighboursLine(some(5, ["The Folded Page"])),
        "5 businesses on Gloucester Road are already on here, including The Folded Page.",
    );
});
