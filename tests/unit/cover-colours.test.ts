import assert from "node:assert/strict";
import { test } from "node:test";

import { contrastRatio } from "@/lib/loyalty-design";
import {
    CATEGORY_COLOURS,
    COVER_FALLBACK,
    coverLayout,
    coverPalette,
    isUsableLogoColour,
} from "@/lib/cover-colours";

test("a logo's own colour is used when it is a colour", () => {
    assert.equal(isUsableLogoColour("#6F4E37"), true);
    assert.equal(isUsableLogoColour("#C53030"), true);
    assert.equal(isUsableLogoColour("#2B6CB0"), true);
});

test("near-white, near-black and grey are refused", () => {
    // The three a logo most often averages to, and the three that make
    // the worst covers.
    assert.equal(isUsableLogoColour("#FFFFFF"), false);
    assert.equal(isUsableLogoColour("#FAFAF8"), false);
    assert.equal(isUsableLogoColour("#000000"), false);
    assert.equal(isUsableLogoColour("#0A0A0C"), false);
    assert.equal(isUsableLogoColour("#808080"), false);
    assert.equal(isUsableLogoColour("#4A4A4A"), false);
    assert.equal(isUsableLogoColour("#D6D6D6"), false);
});

test("nothing, or nonsense, is refused rather than thrown at", () => {
    assert.equal(isUsableLogoColour(null), false);
    assert.equal(isUsableLogoColour(undefined), false);
    assert.equal(isUsableLogoColour(""), false);
    assert.equal(isUsableLogoColour("rebeccapurple"), false);
    assert.equal(isUsableLogoColour("#FFF"), false);
});

test("a usable logo colour wins, and says so", () => {
    const palette = coverPalette({ logoColour: "#6F4E37", categorySlug: "hair-barbers" });

    assert.equal(palette.source, "logo");
    // The category's own colour is not what came back.
    assert.notEqual(palette.from, CATEGORY_COLOURS["hair-barbers"]);
});

test("a grey logo falls through to the trade's colour", () => {
    const palette = coverPalette({ logoColour: "#777777", categorySlug: "cafes-coffee" });

    assert.equal(palette.source, "category");
    assert.notEqual(palette.from, COVER_FALLBACK);
});

test("no logo at all falls through to the trade's colour", () => {
    const palette = coverPalette({ logoColour: null, categorySlug: "bakeries" });

    assert.equal(palette.source, "category");
    assert.notEqual(palette.from, COVER_FALLBACK);
});

// Not asserted as equal to the category colour: a light one is darkened
// until the name on it can be read, which is the whole job. Asserting
// the raw colour came back would be asserting that readability had not
// happened.
test("the trade's colour is where a pale one starts, not where it ends", () => {
    const palette = coverPalette({ logoColour: null, categorySlug: "bakeries" });

    assert.equal(palette.source, "category");
    assert.ok(contrastRatio(palette.ink, palette.from) >= 4.5);
    // Still recognisably the bakery's brown: redder than it is blue.
    const [r, , b] = [1, 3, 5].map((at) => Number.parseInt(palette.from.slice(at, at + 2), 16));
    assert.ok(r > b);
});

test("a trade we have no colour for lands on brand navy", () => {
    const palette = coverPalette({ logoColour: null, categorySlug: "something-new" });

    assert.equal(palette.source, "fallback");
    assert.equal(palette.from, COVER_FALLBACK);
});

test("no logo and no category lands on brand navy", () => {
    const palette = coverPalette({});

    assert.equal(palette.source, "fallback");
    assert.equal(palette.from, COVER_FALLBACK);
});

// No words go on a cover — the page prints the name directly under it —
// but the mark is still held to the contrast a word would need. Below
// it, a cover is a flat rectangle and the trade is invisible.
test("the mark always stands out against the background behind it", () => {
    const candidates = [
        ...Object.values(CATEGORY_COLOURS),
        COVER_FALLBACK,
        "#6F4E37",
        "#FFD400",
        "#9AE6B4",
        "#1A202C",
    ];

    for (const colour of candidates) {
        for (let variation = 0; variation < 6; variation += 1) {
            const palette = coverPalette({ logoColour: colour, variation });

            assert.ok(
                contrastRatio(palette.ink, palette.from) >= 4.5,
                `${colour} variation ${variation}: ${palette.ink} on ${palette.from}`,
            );
            // And against the far end of the gradient, which the name
            // may well be sitting over instead.
            assert.ok(
                contrastRatio(palette.ink, palette.to) >= 4.5,
                `${colour} variation ${variation}: ${palette.ink} on ${palette.to}`,
            );
        }
    }
});

test("every colour it can produce is a six-digit hex", () => {
    for (let variation = 0; variation < 6; variation += 1) {
        const palette = coverPalette({ logoColour: "#C53030", variation });

        for (const value of [palette.from, palette.to, palette.ink]) {
            assert.match(value, /^#[0-9a-f]{6}$/i, `${value} at variation ${variation}`);
        }
    }
});

// Regenerate has to change something, or the button is a lie.
test("regenerating gives six covers before one repeats", () => {
    const seen = new Set<string>();

    for (let variation = 0; variation < 6; variation += 1) {
        const palette = coverPalette({ logoColour: "#6F4E37", variation });
        const layout = coverLayout(variation);

        seen.add([palette.from, palette.to, layout.direction, layout.pattern].join("|"));
    }

    assert.equal(seen.size, 6);
});

test("the seventh is the first again, so previewing is repeatable", () => {
    assert.deepEqual(coverPalette({ logoColour: "#6F4E37", variation: 6 }), coverPalette({ logoColour: "#6F4E37", variation: 0 }));
    assert.deepEqual(coverLayout(6), coverLayout(0));
});

test("a variation is a picture, not a random one", () => {
    // What the admin previewed has to be what gets saved, and the only
    // thing carried between the two is the number.
    assert.deepEqual(
        coverPalette({ logoColour: "#2B6CB0", categorySlug: "dentists", variation: 3 }),
        coverPalette({ logoColour: "#2B6CB0", categorySlug: "dentists", variation: 3 }),
    );
});

test("a channel pushed past its end stays a colour", () => {
    // #FFD400 lightened and #10121A darkened both run off the end of
    // the range, which is where a hex goes to "#1a2b3" or "#10a2ff00".
    for (const colour of ["#FFD400", "#10121A", "#00FF00", "#FF0000"]) {
        for (let variation = 0; variation < 6; variation += 1) {
            const palette = coverPalette({ logoColour: colour, variation });

            assert.match(palette.from, /^#[0-9a-f]{6}$/i);
            assert.match(palette.to, /^#[0-9a-f]{6}$/i);
        }
    }
});
