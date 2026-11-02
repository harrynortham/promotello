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

export const STAMP_ICONS = ["check", "star", "heart", "coffee", "gift"] as const;

export type StampIcon = (typeof STAMP_ICONS)[number];

export const STAMP_ICON_LABELS: Record<StampIcon, string> = {
    check: "Tick",
    star: "Star",
    heart: "Heart",
    coffee: "Coffee",
    gift: "Gift",
};

export const DEFAULT_CARD_COLOUR: CardColour = "navy";
export const DEFAULT_STAMP_ICON: StampIcon = "check";

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

// The stored name, or the default when it is missing or retired.
export function cardColourName(value: string | null | undefined): CardColour {
    return (value ?? "") in CARD_COLOURS
        ? (value as CardColour)
        : DEFAULT_CARD_COLOUR;
}
