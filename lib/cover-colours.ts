import { contrastRatio } from "@/lib/loyalty-design";

// What colour a generated cover is, and why.
//
// Pure on purpose: the dominant colour is read off the logo by sharp on
// the server, and everything after that is arithmetic. It is the part
// worth testing, and the part that decides whether the result is a
// business's own colour or a grey smear.

// Brand navy, the last resort.
export const COVER_FALLBACK = "#17233B";

// A colour per trade, for a business whose logo tells us nothing — no
// logo at all, or one that is black, white or grey, which most of them
// are. Picked to sit apart from each other in the directory rather than
// to be literal: a barber's chair is not red here because half the
// listings would be.
//
// Keyed by the category slug. Anything not named falls to navy, which
// is why this does not have to list all forty-odd.
export const CATEGORY_COLOURS: Record<string, string> = {
    "cafes-coffee": "#6F4E37",
    bakeries: "#C68B59",
    restaurants: "#9B2C2C",
    "pubs-bars": "#7B341E",
    takeaways: "#B7791F",
    "ice-cream-desserts": "#D53F8C",
    "delis-grocers": "#2F855A",
    "farm-shops": "#38A169",
    "butchers-fishmongers": "#9C4221",
    "activities-experiences": "#2B6CB0",
    "cinema-theatre": "#44337A",
    "fitness-sport": "#2C5282",
    "classes-workshops": "#2A4365",
    attractions: "#285E61",
    "fashion-vintage": "#702459",
    "books-music": "#4A5568",
    "home-gifts": "#975A16",
    "plants-flowers": "#276749",
    "makers-markets": "#8B5E3C",
    "newsagents-convenience": "#2D3748",
    "jewellery-watches": "#744210",
    "hair-barbers": "#1A365D",
    "beauty-nails": "#B83280",
    "spas-massage": "#2C7A7B",
    "yoga-wellbeing": "#319795",
    "tattoo-piercing": "#1A202C",
    pharmacies: "#2B6CB0",
    opticians: "#2C5282",
    dentists: "#2B6CB0",
    "clinics-physio": "#2C7A7B",
    "bike-repair": "#276749",
    "pet-care": "#B7791F",
    "home-garden": "#2F855A",
    "repairs-alterations": "#4A5568",
    "professional-services": "#2D3748",
    "garages-mot": "#1A202C",
    "car-wash-valeting": "#2B6CB0",
    "phone-computer-repair": "#2D3748",
    "dry-cleaning-laundry": "#2C5282",
    "childcare-nurseries": "#D69E2E",
    "taxis-transport": "#975A16",
    "driving-schools": "#2B6CB0",
    "hotels-bnbs": "#44337A",
    "tours-days-out": "#285E61",
};

export type CoverPalette = {
    // The two ends of the gradient.
    from: string;
    to: string;
    // What the trade's mark is drawn in: white or navy, whichever the
    // background can carry. There are no words on a cover, so this is
    // the pattern's colour and nothing else — but it is still held to
    // the contrast a word would need, because a pattern nobody can make
    // out is a flat rectangle with extra steps.
    ink: string;
    // Where the colour came from, so the admin can be told rather than
    // left guessing why a cover is navy.
    source: "logo" | "category" | "fallback";
};

// A logo's dominant colour is only worth using if it is a colour.
//
// Most logos are black on white or white on black, and a great many are
// grey. Averaging those gives a smear that says nothing about the
// business and looks broken beside one that worked, so they are refused
// here and the trade's colour is used instead.
export function isUsableLogoColour(hex: string | null | undefined) {
    if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;

    const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    // Near-white and near-black, by how much light comes off them.
    if (contrastRatio(hex, "#FFFFFF") < 1.3) return false;
    if (contrastRatio(hex, "#000000") < 1.3) return false;

    // Grey: the three channels within a short distance of each other,
    // which is saturation without the arithmetic of converting to HSL.
    return max - min >= 28;
}

// Darkened or lightened by a fraction, staying in range.
//
// Uppercase, like every other colour written down in this codebase —
// the brand three in CLAUDE.md and the card palette both. A lowercase
// hex is the same colour and compares unequal, which is a confusing
// thing to debug from a screenshot that looks right.
function shift(hex: string, by: number) {
    const channels = [1, 3, 5]
        .map((at) => Number.parseInt(hex.slice(at, at + 2), 16))
        .map((value) => Math.round(Math.min(255, Math.max(0, value + by * 255))));

    return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// The mark has to be visible, so the background gives way rather than
// the ink.
//
// readableInk picks white or navy at a 3:1 threshold, which is the bar
// for a loyalty card's large heading and below the 4.5:1 one for
// ordinary text. On a mid-tone — a bakery's #C68B59 darkened, say — it
// chose navy and the result failed at 3.4:1. The ink is one of two
// colours and the mark's shape is fixed, so the background is the only
// thing left that can move.
function readableOver(from: string, to: string) {
    const ink = contrastRatio("#FFFFFF", to) >= contrastRatio(BRAND_NAVY, to) ? "#FFFFFF" : BRAND_NAVY;
    // White text wants a darker background; navy text wants a lighter
    // one.
    const step = ink === "#FFFFFF" ? -0.04 : 0.04;

    let [backdrop, far] = [from, to];

    for (let tries = 0; tries < 24; tries += 1) {
        if (contrastRatio(ink, backdrop) >= 4.5 && contrastRatio(ink, far) >= 4.5) break;

        backdrop = shift(backdrop, step);
        far = shift(far, step);
    }

    return { from: backdrop, to: far, ink };
}

const BRAND_NAVY = "#17233B";

// The palette for one cover.
//
// variation walks through the shades so "Regenerate" gives something
// actually different rather than the same picture again. It is a number
// rather than a random, so the same variation always looks the same —
// what the admin previewed is what gets saved.
export function coverPalette({
    logoColour,
    categorySlug,
    variation = 0,
}: {
    logoColour?: string | null;
    categorySlug?: string | null;
    variation?: number;
}): CoverPalette {
    const fromLogo = isUsableLogoColour(logoColour) ? logoColour! : null;
    const fromCategory = categorySlug ? CATEGORY_COLOURS[categorySlug] : undefined;

    const base = fromLogo ?? fromCategory ?? COVER_FALLBACK;
    const source: CoverPalette["source"] = fromLogo ? "logo" : fromCategory ? "category" : "fallback";

    // Three shades, so pressing Regenerate three times is three
    // different covers and the fourth is the first again.
    const depth = [0, -0.12, 0.1][variation % 3];
    const { from, to, ink } = readableOver(shift(base, depth), shift(base, depth - 0.22));

    return { from, to, ink, source };
}

// Which way the gradient runs, and which pattern is used. Separate from
// the colours because they rotate on a different cycle: three shades
// against two directions gives six covers before one repeats.
export function coverLayout(variation = 0) {
    return {
        direction: variation % 2 === 0 ? "135deg" : "45deg",
        // A wall of small marks, or one big one off to the side.
        //
        // Divided by three rather than two, so this turns over on the
        // same six as the shades do. On a four-step cycle against the
        // shades' three the pair only come back round after twelve, and
        // "Regenerate" six times would have walked past the one the
        // admin liked.
        pattern: Math.floor(variation / 3) % 2 === 0 ? ("tiled" as const) : ("single" as const),
    };
}
