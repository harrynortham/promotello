import shapes, { type IconShapes } from "@/lib/cover-icon-shapes";

import { DEFAULT_ICON } from "@/lib/cover-icon-default";

export { DEFAULT_ICON };

// The mark drawn behind a generated cover: one of lucide's, named.
//
// It used to hang off the category, one mark per trade. That was one
// mark too few — "Pubs & bars" is a cocktail bar and a local with a
// carpet, and a cover tiled with martini glasses for The Anchor says
// nobody looked at the place. The whole library is open to whoever is
// building the page, which is the person who has just read the
// business's website.
//
// Shapes rather than components, from a file rather than from
// lucide-react, for two separate reasons. Satori cannot call a lucide
// icon at all: every one is built on Icon.mjs, which carries "use
// client", and rendering it server-side fails. And reaching for the
// icon's own module at request time cannot be traced by Next, so
// nothing would be deployed and every cover would come out a plain
// gradient — see scripts/build-cover-icons.mjs, which writes this.
export type { IconShapes };

const library = shapes;

export const ICON_NAMES = Object.keys(library);

export function isIconName(name: unknown): name is string {
    return typeof name === "string" && Object.prototype.hasOwnProperty.call(library, name);
}

// The name, if we have that icon, or the shop front.
//
// Checked rather than trusted: it arrives in a request and picks what
// gets drawn. hasOwnProperty rather than `in`, so "constructor" is not
// an icon.
export function iconName(name: unknown) {
    return isIconName(name) ? name : DEFAULT_ICON;
}

export function iconShapes(name: unknown): IconShapes {
    return library[iconName(name)] ?? [];
}
