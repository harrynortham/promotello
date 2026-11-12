// How a poster is printed. The arrangement is chosen when the code is
// made and lives on the row; this is decided here, in front of the
// printer, and any layout prints any of these ways.
//
// Sizes tile: `across` and `down` say how many copies share one sheet,
// and the numbers are chosen so they fill it exactly and cut straight.
// "Two per sheet" is two A5s on a landscape A4 — 148mm twice is 296 of
// 297 — for a business that wants one per table.
//
// The last two are not posters. A window needs something to read from
// the pavement; the back of a till and the corner of a table need
// something small enough that nobody minds it being there, which is a
// different shape as well as a different size.

export const POSTER_SIZES = [
    {
        value: "a4",
        label: "A4",
        hint: "A window or a noticeboard.",
        width: "210mm",
        height: "297mm",
        scale: 1,
        page: "A4 portrait",
        across: 1,
        down: 1,
    },
    {
        value: "a5",
        label: "A5",
        hint: "Half a sheet, for a counter.",
        width: "148mm",
        height: "210mm",
        scale: 0.705,
        page: "A5 portrait",
        across: 1,
        down: 1,
    },
    {
        value: "a5x2",
        label: "Two per sheet",
        hint: "Two A5s to cut apart.",
        width: "148mm",
        height: "210mm",
        scale: 0.705,
        page: "A4 landscape",
        across: 2,
        down: 1,
    },
    {
        value: "table",
        label: "Table card",
        hint: "Four little landscape cards, for table corners.",
        width: "148mm",
        height: "105mm",
        scale: 0.5,
        page: "A4 landscape",
        across: 2,
        down: 2,
    },
    {
        value: "strip",
        label: "Till strip",
        hint: "Three strips, for the back of a till or a counter edge.",
        width: "210mm",
        height: "99mm",
        scale: 0.52,
        page: "A4 portrait",
        across: 1,
        down: 3,
    },
] as const;

export type PosterSize = (typeof POSTER_SIZES)[number]["value"];

export type PosterSizeOption = (typeof POSTER_SIZES)[number];

export function posterSize(value: string | null | undefined) {
    return POSTER_SIZES.find((option) => option.value === value) ?? POSTER_SIZES[0];
}

// Wider than it is tall: the sheet has room for one arrangement, and it
// is not the one a window wants.
export function isLandscape(size: PosterSizeOption) {
    return Number.parseFloat(size.width) > Number.parseFloat(size.height);
}

// The paper the sheet is printed on, which is the poster itself except
// where several are sharing it.
export function sheetSize(size: PosterSizeOption) {
    const millimetres = (value: string, times: number) =>
        `${Number.parseFloat(value) * times}mm`;

    return {
        width: millimetres(size.width, size.across),
        height: millimetres(size.height, size.down),
    };
}

// How many copies share the sheet.
export function copiesOn(size: PosterSizeOption) {
    return size.across * size.down;
}
