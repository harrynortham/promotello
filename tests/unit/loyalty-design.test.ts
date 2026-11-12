import assert from "node:assert/strict";
import { test } from "node:test";

import {
    CARD_COLOURS,
    contrastRatio,
    readableAccent,
    readableInk,
    tint,
} from "@/lib/loyalty-design";

test("contrast is the WCAG ratio, whichever way round it is asked", () => {
    assert.equal(Math.round(contrastRatio("#FFFFFF", "#000000")), 21);
    assert.equal(Math.round(contrastRatio("#000000", "#FFFFFF")), 21);
    assert.equal(contrastRatio("#FF593F", "#FF593F"), 1);
});

test("a tint is the colour laid over white, not the colour", () => {
    assert.equal(tint("#000000", 0.1), "#e6e6e6");
    assert.equal(tint("#FF593F", 1), "#ff593f");
    assert.equal(tint("#FF593F", 0), "#ffffff");
});

// The gold and the teal are picked to carry white on a filled stamp.
// As words on the card's near-white body they were barely there.
test("every card colour's accent can be read on its own tint", () => {
    for (const [name, palette] of Object.entries(CARD_COLOURS)) {
        const background = tint(palette.stamp, 0.1);
        const ink = readableAccent(palette.stamp, background);

        assert.ok(
            contrastRatio(ink, background) >= 4.5,
            `${name} reads at ${contrastRatio(ink, background).toFixed(2)}`,
        );
    }
});

test("a colour dark enough already is left exactly as it is", () => {
    const navy = "#17233B";

    assert.equal(readableAccent(navy, tint(navy, 0.1)), navy);
});

// A business picking its own can choose something far worse than the
// palette allows.
test("a colour nobody could read is taken down until it can be", () => {
    const yellow = "#FFEE00";
    const background = tint(yellow, 0.1);

    assert.ok(contrastRatio(yellow, background) < 2, "unreadable to start with");
    assert.ok(contrastRatio(readableAccent(yellow, background), background) >= 4.5);
});

// The band and the filled stamps keep white, which is the brand: white
// on coral is 3.1 to one and deliberate. A gold at 2.2 is not a mark on
// the stamp at all, so that one gets the navy.
test("white stays on the brand's colours, and goes where it cannot be seen", () => {
    assert.equal(readableInk("#17233B"), "#FFFFFF", "navy band");
    assert.equal(readableInk("#FF593F"), "#FFFFFF", "coral, the brand");
    assert.equal(readableInk("#1F4034"), "#FFFFFF", "forest band");
    assert.equal(readableInk("#2FA3A3"), "#FFFFFF", "ocean's teal stamp");
    assert.equal(readableInk("#E0A33E"), "#17233B", "charcoal's gold stamp");
    assert.equal(readableInk("#FFEE00"), "#17233B", "a yellow of somebody's own");
});

test("the ink on a stamp is always something you can see", () => {
    for (const palette of Object.values(CARD_COLOURS)) {
        for (const colour of [palette.header, palette.stamp]) {
            assert.ok(
                contrastRatio(readableInk(colour), colour) >= 3,
                `${colour} carries ${readableInk(colour)}`,
            );
        }
    }
});
