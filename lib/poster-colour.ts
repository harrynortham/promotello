// The colours a poster is printed in.
//
// Six named palettes cover most businesses, and a seventh — "custom" —
// is the two colours out of their own logo. A name resolves through
// lib/loyalty-design.ts, which the loyalty card shares; a custom palette
// is two hex values stored on the code itself.
//
// Imports nothing from Next.js or Supabase, so it unit tests on its own
// (tests/unit/poster-colour.test.ts).

import { CARD_COLOURS, cardColour } from "@/lib/loyalty-design";

export const CUSTOM_COLOUR = "custom";

// What the picker produces: #rrggbb, either case.
export function isHexColour(value: string | null | undefined): value is string {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

// Perceived lightness, 0 (black) to 1 (white), sRGB-weighted. Used to
// decide what can be read on top of a colour rather than to describe it.
export function lightnessOf(hex: string) {
    const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
    const channel = (value: number) =>
        value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// White on a brand colour is a safe bet until somebody's brand is
// yellow. The threshold is where white and our navy swap over for
// contrast against the same background.
export function readableInk(hex: string) {
    return lightnessOf(hex) > 0.45 ? "#17233B" : "#FFFFFF";
}

export type PosterTheme = {
    // The band, or the whole sheet on the bold layout.
    header: string;
    // The pill above the headline.
    accent: string;
    // What can be read on the header.
    ink: string;
    // What can be read on the pill.
    accentInk: string;
};

// The palette a poster prints in: a named one, or the business's own.
// A custom colour with half its pair missing falls back to the name,
// which is what the database allows anyway.
export function posterTheme({
    colour,
    header,
    accent,
}: {
    colour?: string | null;
    header?: string | null;
    accent?: string | null;
}): PosterTheme {
    if (colour === CUSTOM_COLOUR && isHexColour(header) && isHexColour(accent)) {
        return {
            header,
            accent,
            ink: readableInk(header),
            accentInk: readableInk(accent),
        };
    }

    const named = cardColour(colour);

    return {
        header: named.header,
        accent: named.stamp,
        // The six are all dark enough to carry white.
        ink: "#FFFFFF",
        accentInk: "#FFFFFF",
    };
}

// A starting pair for somebody who has never opened the picker: the
// palette they were already looking at.
export function startingCustom(colour: string | null | undefined) {
    const named = cardColour(colour);

    return { header: named.header, accent: named.stamp };
}

export const NAMED_COLOURS = Object.keys(CARD_COLOURS);
