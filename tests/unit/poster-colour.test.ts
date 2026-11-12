import assert from "node:assert/strict";
import { test } from "node:test";

import { cardColourChoice, cardTheme } from "@/lib/loyalty-design";
import {
    isHexColour,
    lightnessOf,
    posterTheme,
    readableInk,
    startingCustom,
} from "@/lib/poster-colour";

test("only a six-digit hex is a colour", () => {
    assert.equal(isHexColour("#FF593F"), true);
    assert.equal(isHexColour("#ff593f"), true);

    for (const wrong of ["#FFF", "FF593F", "#GG593F", "", null, undefined, "red"]) {
        assert.equal(isHexColour(wrong as string), false, String(wrong));
    }
});

test("what can be read on a colour is worked out, not assumed", () => {
    // The brand's own two, and the extremes.
    assert.equal(readableInk("#17233B"), "#FFFFFF", "navy");
    assert.equal(readableInk("#FF593F"), "#FFFFFF", "coral");
    assert.equal(readableInk("#000000"), "#FFFFFF");
    assert.equal(readableInk("#FFFFFF"), "#17233B");

    // The case this exists for: a pale brand colour, where white type
    // would disappear.
    assert.equal(readableInk("#FFE14D"), "#17233B", "yellow");
    assert.equal(readableInk("#BFE3C6"), "#17233B", "mint");

    assert.ok(lightnessOf("#FFFFFF") > lightnessOf("#17233B"));
});

test("a named palette is still a named palette", () => {
    const navy = posterTheme({ colour: "navy" });

    assert.equal(navy.header, "#17233B");
    assert.equal(navy.accent, "#FF593F");
    assert.equal(navy.ink, "#FFFFFF");

    // Nothing stored, or a name we have since retired.
    assert.deepEqual(posterTheme({}), navy);
    assert.deepEqual(posterTheme({ colour: "sunset" }), navy);
});

test("a custom palette is theirs, with readable type on it", () => {
    const theme = posterTheme({ colour: "custom", header: "#FFE14D", accent: "#2B2B2B" });

    assert.equal(theme.header, "#FFE14D");
    assert.equal(theme.accent, "#2B2B2B");
    assert.equal(theme.ink, "#17233B", "dark type on a yellow band");
    assert.equal(theme.accentInk, "#FFFFFF");
});

test("half a custom palette is not one", () => {
    // The database refuses this, so it can only arrive from an older row
    // or somebody writing by hand. It reads as navy rather than as a
    // poster with no colour at all.
    const navy = posterTheme({ colour: "navy" });

    assert.deepEqual(posterTheme({ colour: "custom", header: "#FFE14D" }), navy);
    assert.deepEqual(posterTheme({ colour: "custom", header: "nonsense", accent: "#2B2B2B" }), navy);
});

test("the picker opens on whatever they were looking at", () => {
    assert.deepEqual(startingCustom("ocean"), { header: "#13404F", accent: "#2FA3A3" });
    assert.deepEqual(startingCustom(null), { header: "#17233B", accent: "#FF593F" });
});

test("a card is drawn in the business's own colours, or one of the six", () => {
    assert.deepEqual(cardTheme({ colour: "navy" }), {
        header: "#17233B",
        stamp: "#FF593F",
        ink: "#FFFFFF",
    });

    // Their own pair, with ink that can be read on it.
    assert.deepEqual(cardTheme({ colour: "custom", header: "#0B5FFF", accent: "#FFD400" }), {
        header: "#0B5FFF",
        stamp: "#FFD400",
        ink: "#FFFFFF",
    });

    // A pale band takes dark type.
    assert.equal(cardTheme({ colour: "custom", header: "#FFD400", accent: "#111111" }).ink, "#17233B");

    // Half a palette is no palette: back to the name it was saved under.
    assert.deepEqual(cardTheme({ colour: "custom", header: "#0B5FFF", accent: null }), {
        header: "#17233B",
        stamp: "#FF593F",
        ink: "#FFFFFF",
    });

    // And a card saved as custom still reads as custom in the picker.
    assert.equal(cardColourChoice("custom"), "custom");
    assert.equal(cardColourChoice("forest"), "forest");
    assert.equal(cardColourChoice("nonsense"), "navy");
});
