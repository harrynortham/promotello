// The colours a poster is printed in.
//
// Six named palettes cover most businesses, and a seventh — "custom" —
// is the two colours out of their own logo. A name resolves through
// lib/loyalty-design.ts, which the loyalty card shares; a custom palette
// is two hex values stored on the code itself.
//
// Imports nothing from Next.js or Supabase, so it unit tests on its own
// (tests/unit/poster-colour.test.ts).

import {
    CARD_COLOURS,
    cardColour,
    CUSTOM_COLOUR,
    isHexColour,
    lightnessOf,
    readableInk,
} from "@/lib/loyalty-design";

// A poster and a card are coloured the same way, so the hex helpers
// live with the palette and are re-exported here for everything that
// already asks this module for them.
export { CUSTOM_COLOUR, isHexColour, lightnessOf, readableInk };

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
// palette they were already looking at. The card picker asks the same
// question, so the answer lives with the palette.
export { startingCustomColours as startingCustom } from "@/lib/loyalty-design";

export const NAMED_COLOURS = Object.keys(CARD_COLOURS);
