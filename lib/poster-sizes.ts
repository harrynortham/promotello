// How a poster is printed. The arrangement is chosen when the code is
// made and lives on the row; this is decided here, in front of the
// printer, and any layout prints any of these ways.
//
// "Two per sheet" is two A5 posters side by side on a landscape A4,
// which tiles exactly — 148mm twice is 296mm of 297 — so a business
// wanting one per table cuts down the middle rather than printing twice.
//
// "Four per sheet" is the same trick once more: four A6 cards on a
// portrait A4, 105mm twice across and 148mm twice down. Small enough
// to tape to a till or stand on a table, and four at a time is what a
// room full of tables actually needs.

export const POSTER_SIZES = [
    {
        value: "a4",
        label: "A4",
        // Where it goes. A business choosing between A4 and A6 is
        // really choosing between a window and a table, and the
        // millimetres are how we get there rather than the decision.
        where: "Your window",
        width: "210mm",
        height: "297mm",
        scale: 1,
        page: "A4 portrait",
        copies: 1,
    },
    {
        value: "a5",
        label: "A5",
        where: "The counter",
        width: "148mm",
        height: "210mm",
        scale: 0.705,
        page: "A5 portrait",
        copies: 1,
    },
    {
        value: "a5x2",
        label: "Two per sheet",
        where: "A counter and a door",
        width: "148mm",
        height: "210mm",
        scale: 0.705,
        page: "A4 landscape",
        copies: 2,
    },
    {
        value: "a6x4",
        label: "Four per sheet",
        where: "Tables, or by the till",
        width: "105mm",
        height: "148mm",
        scale: 0.5,
        page: "A4 portrait",
        copies: 4,
    },
] as const;

export type PosterSize = (typeof POSTER_SIZES)[number]["value"];

export function posterSize(value: string | null | undefined) {
    return POSTER_SIZES.find((option) => option.value === value) ?? POSTER_SIZES[0];
}

// The paper the sheet is printed on, which is the poster itself except
// when two are sharing it.
export function sheetSize(size: (typeof POSTER_SIZES)[number]) {
    if (size.copies === 4) {
        return { width: "210mm", height: "296mm" };
    }

    return size.copies > 1
        ? { width: "296mm", height: "210mm" }
        : { width: size.width, height: size.height };
}

// The same sheet drawn small: a preview, or a picture of a poster on
// another page. Everything in QrPoster is sized in em from the root
// size, so one number scales the whole thing — 16px is A4's 794px
// across.
export function posterAtWidth(pixels: number) {
    return {
        width: `${pixels}px`,
        height: `${Math.round(pixels * (297 / 210))}px`,
        fontSize: 16 * (pixels / 794),
    };
}
