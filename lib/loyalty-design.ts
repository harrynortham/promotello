// How a loyalty card looks. The names are stored on loyalty_programs, so
// the palette lives here rather than in the database and a card can be
// restyled without a migration.

export const CARD_COLOURS = {
    navy: { label: "Navy", header: "#17233B", stamp: "#FF593F" },
    coral: { label: "Coral", header: "#FF593F", stamp: "#17233B" },
    forest: { label: "Forest", header: "#1F4034", stamp: "#C8763C" },
    plum: { label: "Plum", header: "#3C2342", stamp: "#D4705A" },
    ocean: { label: "Ocean", header: "#13404F", stamp: "#2FA3A3" },
    charcoal: { label: "Charcoal", header: "#2B2B2B", stamp: "#E0A33E" },
} as const;

export type CardColour = keyof typeof CARD_COLOURS;

// A stamp that looks like what the shop sells beats a tick, so the
// list leans towards the trades on a high street rather than shapes.
export const STAMP_ICONS = ["check", "star", "heart", "coffee", "gift", "scissors", "bag"] as const;

export type StampIcon = (typeof STAMP_ICONS)[number];

export const STAMP_ICON_LABELS: Record<StampIcon, string> = {
    check: "Tick",
    star: "Star",
    heart: "Heart",
    coffee: "Coffee",
    gift: "Gift",
    scissors: "Scissors",
    bag: "Bag",
};

export const DEFAULT_CARD_COLOUR: CardColour = "navy";
export const DEFAULT_STAMP_ICON: StampIcon = "check";

// A business's own two colours, instead of one of the six.
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

// What the picker can have chosen, and the pair behind "custom".
export type CardChoice = CardColour | typeof CUSTOM_COLOUR;
export type CustomColours = { header: string; accent: string };

// A starting pair for somebody who has never opened the picker: the
// palette they were already looking at.
export function startingCustomColours(colour: string | null | undefined): CustomColours {
    const named = cardColour(colour);

    return { header: named.header, accent: named.stamp };
}

export type CardTheme = {
    // The band across the top of the card.
    header: string;
    // The stamps, and the ring around the ones still to earn.
    stamp: string;
    // What can be read on the band.
    ink: string;
};

// The palette a card is drawn in: one of the six, or the business's
// own. A custom colour missing half its pair falls back to the name,
// which is what the database allows anyway.
export function cardTheme({
    colour,
    header,
    accent,
}: {
    colour?: string | null;
    header?: string | null;
    accent?: string | null;
}): CardTheme {
    if (colour === CUSTOM_COLOUR && isHexColour(header) && isHexColour(accent)) {
        return { header, stamp: accent, ink: readableInk(header) };
    }

    const named = cardColour(colour);

    // The six are all dark enough to carry white.
    return { header: named.header, stamp: named.stamp, ink: "#FFFFFF" };
}

// Anything stored before a colour or icon was chosen, or a value that has
// since been retired, falls back to the original look.
export function cardColour(value: string | null | undefined) {
    return CARD_COLOURS[(value ?? "") as CardColour] ?? CARD_COLOURS[DEFAULT_CARD_COLOUR];
}

// Rewards are written as a business would title them ("A free coffee"), so
// they need lowercasing to sit mid-sentence.
export function rewardWording(reward: string) {
    const trimmed = reward.trim();
    return trimmed ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1) : "your reward";
}

export function stampIcon(value: string | null | undefined): StampIcon {
    return STAMP_ICONS.includes((value ?? "") as StampIcon)
        ? (value as StampIcon)
        : DEFAULT_STAMP_ICON;
}

// What the picker should show as chosen: one of the six, or the
// business's own. cardColourName() can't answer this — it has to return
// one of the six — so a card saved as "custom" would come back navy.
export function cardColourChoice(
    value: string | null | undefined,
): CardColour | typeof CUSTOM_COLOUR {
    return value === CUSTOM_COLOUR ? CUSTOM_COLOUR : cardColourName(value);
}

// The stored name, or the default when it is missing or retired.
export function cardColourName(value: string | null | undefined): CardColour {
    return (value ?? "") in CARD_COLOURS
        ? (value as CardColour)
        : DEFAULT_CARD_COLOUR;
}
