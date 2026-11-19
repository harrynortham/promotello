// One mark per trade, for the pattern behind a generated cover.
//
// The marks live on categories.icon_path, not here, so a category added
// through /admin/categories can be given its own without shipping code.
// This file is only what to draw when there isn't one, and how to hand
// a path to next/og.
//
// Paths rather than lucide components: next/og renders through satori,
// which draws an <img> of an SVG data URI reliably and a React icon
// component much less so. The seeded paths are lucide's own, traced on
// the same 24-box, so a cover and the rest of the site draw the same
// cup.

// A shop front: true of every business, so it is what an unmarked
// category falls back to.
export const SHOP_ICON =
    "M3 9h18M5 9V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9";

export function categoryIcon(iconPath?: string | null) {
    return iconPath?.trim() || SHOP_ICON;
}

// The mark as something satori will draw: a data URI, stroked in the
// pattern colour at the opacity the cover wants.
//
// The path is quoted into an attribute, so a double quote in it would
// close the attribute early and the rest would be read as markup. It
// comes from an admin typing into /admin/categories rather than from
// the public, but a cover that silently stops rendering because
// somebody pasted a whole <path d="…"> is a bad afternoon, so the
// quotes come out.
export function iconDataUri(path: string, colour: string, opacity: number) {
    const safe = path.replace(/["<>]/g, " ");
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ` +
        `stroke="${colour}" stroke-opacity="${opacity}" stroke-width="1.5" stroke-linecap="round" ` +
        `stroke-linejoin="round"><path d="${safe}"/></svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
