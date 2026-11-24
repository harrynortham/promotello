// How the parts of a poster are arranged.
//
// Here rather than in the component beside lib/poster-sizes.ts, which
// decides the other half of the same question: a layout is a rule about
// a sheet, not a piece of rendering, and the rules are worth a test that
// does not need a browser to run.

export const POSTER_LAYOUTS = [
    {
        value: "classic",
        label: "Classic",
        hint: "Your name across the top, the offer in the middle.",
    },
    {
        value: "code_first",
        label: "Code first",
        hint: "The code up top, for tables and tills where they're already close.",
    },
    {
        value: "bold",
        label: "Bold",
        hint: "The whole sheet in colour, to read through a window.",
    },
    {
        value: "minimal",
        label: "Minimal",
        hint: "No colour block. Quiet enough for a smart window.",
    },
    {
        value: "follow",
        label: "Follow us",
        hint: "Why it's worth following, for a counter or a door.",
        forFollow: true,
    },
    {
        value: "review_quiet",
        label: "Quiet",
        hint: "Your name, one line and the code. For a window you don't want shouting.",
        forReview: true,
    },
    {
        value: "review_bold",
        label: "Bold",
        hint: "The whole sheet in your colour, to read through glass.",
        forReview: true,
    },
    {
        value: "review_code_first",
        label: "Code first",
        hint: "The code up top, for a till or a table where they're already close.",
        forReview: true,
    },
    {
        value: "stamp_card",
        label: "Stamp card",
        hint: "The card itself, so people see what they are collecting.",
        forLoyalty: true,
    },
    {
        value: "stamp_strip",
        label: "Stamp strip",
        hint: "A line of stamps across the sheet, with the reward above it.",
        forLoyalty: true,
    },
] as const;

export type PosterLayout = (typeof POSTER_LAYOUTS)[number]["value"];

// The two that draw a card are offered only where there is one to draw.
export const LOYALTY_LAYOUTS = POSTER_LAYOUTS.filter(
    (option) => "forLoyalty" in option && option.forLoyalty,
).map((option) => option.value) as readonly PosterLayout[];

export function isLoyaltyLayout(value: string | null | undefined) {
    return LOYALTY_LAYOUTS.includes(value as PosterLayout);
}

// Offered only on a code that follows, and the only one offered there:
// the others all say "scan for offers", which is not what the sheet is
// for.
export const FOLLOW_LAYOUTS = POSTER_LAYOUTS.filter(
    (option) => "forFollow" in option && option.forFollow,
).map((option) => option.value) as readonly PosterLayout[];

export function isFollowLayout(value: string | null | undefined) {
    return FOLLOW_LAYOUTS.includes(value as PosterLayout);
}

// The three a review poster is drawn in, and the only three offered
// there. Every other layout says "scan for offers" somewhere on it,
// which is not what this sheet is asking for.
export const REVIEW_LAYOUTS = POSTER_LAYOUTS.filter(
    (option) => "forReview" in option && option.forReview,
).map((option) => option.value) as readonly PosterLayout[];

export function isReviewLayout(value: string | null | undefined) {
    return REVIEW_LAYOUTS.includes(value as PosterLayout);
}

export function posterLayout(value: string | null | undefined): PosterLayout {
    return POSTER_LAYOUTS.some((option) => option.value === value)
        ? (value as PosterLayout)
        : "classic";
}
