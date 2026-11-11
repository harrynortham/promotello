// What kind of offer it is, and the headline built from it.
//
// A business picks a type and fills in only what that type needs; we write
// offers.discount from those fields, so "20% offer" can't happen and a
// customer can filter by type. The headline is still what every other
// surface reads — cards, the offer page, emails, posters, vouchers, the
// till — and nothing else in the codebase assembles one.
//
// Imports nothing from Next.js or Supabase, the same rule as
// lib/listing-filters.ts, so it unit tests on its own
// (tests/unit/offer-kinds.test.ts).

export type OfferKind =
    | "percent_off"
    | "money_off"
    | "two_for_one"
    | "multi_buy"
    | "fixed_price"
    | "freebie"
    | "other";

export type OfferKindInput = "value" | "quantity" | "item" | "text";

export type OfferKindSpec = {
    kind: OfferKind;
    // On the picker in the business form.
    label: string;
    // On the customer's filter. Null for a type the filter never offers.
    filterLabel: string | null;
    // In ?type=. Null for the same reason.
    slug: string | null;
    // Which inputs the form shows once this type is picked.
    inputs: OfferKindInput[];
    // Whether the item ("pints", "pastry") has to be filled in.
    itemRequired: boolean;
    // Shown under the inputs, in the business's own kind of words.
    example: string;
};

export const OFFER_KINDS: OfferKindSpec[] = [
    {
        kind: "percent_off",
        label: "Percentage off",
        filterLabel: "% off",
        slug: "percent-off",
        inputs: ["value", "item"],
        itemRequired: false,
        example: "20% off, or 20% off pints",
    },
    {
        kind: "money_off",
        label: "Money off",
        filterLabel: "Money off",
        slug: "money-off",
        inputs: ["value", "item"],
        itemRequired: false,
        example: "£5 off, or £5 off a cut and finish",
    },
    {
        kind: "two_for_one",
        label: "2 for 1",
        filterLabel: "2 for 1",
        slug: "2-for-1",
        inputs: ["item"],
        itemRequired: false,
        example: "2 for 1, or 2 for 1 on cocktails",
    },
    {
        kind: "multi_buy",
        label: "Multi-buy",
        filterLabel: "Multi-buy",
        slug: "multi-buy",
        inputs: ["quantity", "value"],
        itemRequired: false,
        example: "2 for £15",
    },
    {
        kind: "fixed_price",
        label: "Set price",
        filterLabel: "Set price",
        slug: "set-price",
        inputs: ["value", "item"],
        itemRequired: true,
        example: "£8 beard trim",
    },
    {
        kind: "freebie",
        label: "Something free",
        filterLabel: "Freebies",
        slug: "freebie",
        inputs: ["item"],
        itemRequired: true,
        example: "Free pastry, or Free late checkout",
    },
    {
        kind: "other",
        label: "Something else",
        filterLabel: null,
        slug: null,
        inputs: ["text"],
        itemRequired: false,
        example: "3rd half price",
    },
];

export const ITEM_MAX = 24;
export const HEADLINE_MAX = 30;

export function isOfferKind(value: string | null | undefined): value is OfferKind {
    return OFFER_KINDS.some((spec) => spec.kind === value);
}

export function offerKind(kind: OfferKind) {
    return OFFER_KINDS.find((spec) => spec.kind === kind) ?? OFFER_KINDS[OFFER_KINDS.length - 1];
}

export function kindFromSlug(slug: string | null | undefined) {
    return OFFER_KINDS.find((spec) => spec.slug && spec.slug === slug)?.kind ?? null;
}

export function slugOfKind(kind: OfferKind) {
    return offerKind(kind).slug;
}

export function kindTakes(kind: OfferKind, input: OfferKindInput) {
    return offerKind(kind).inputs.includes(input);
}

// £5, £2.50 — never £5.00, and never a stray £0.
export function money(value: number) {
    const rounded = Math.round(value * 100) / 100;

    return `£${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)}`;
}

function cleanItem(item: string | null | undefined) {
    return (item ?? "").replace(/\s+/g, " ").trim().slice(0, ITEM_MAX);
}

export type HeadlineParts = {
    kind: OfferKind;
    value?: number | string | null;
    quantity?: number | string | null;
    item?: string | null;
    // "Something else": the headline as written.
    text?: string | null;
};

// The one place a headline is assembled. An incomplete set of parts gives
// an empty string rather than a half-written one — the form shows it as
// they type, and "20% off" shouldn't flash past as "% off".
export function offerHeadline({ kind, value, quantity, item, text }: HeadlineParts): string {
    const amount = value === null || value === undefined || value === "" ? null : Number(value);
    const count = quantity === null || quantity === undefined || quantity === "" ? null : Number(quantity);
    const about = cleanItem(item);
    const hasAmount = amount !== null && Number.isFinite(amount) && amount > 0;

    switch (kind) {
        case "percent_off":
            if (!hasAmount) return "";
            return `${Math.round(amount!)}% off${about ? ` ${about}` : ""}`;

        case "money_off":
            if (!hasAmount) return "";
            return `${money(amount!)} off${about ? ` ${about}` : ""}`;

        case "two_for_one":
            return `2 for 1${about ? ` on ${about}` : ""}`;

        case "multi_buy":
            if (!hasAmount || count === null || !Number.isFinite(count) || count < 2) return "";
            return `${Math.round(count)} for ${money(amount!)}`;

        case "fixed_price":
            if (!hasAmount || !about) return "";
            return `${money(amount!)} ${about}`;

        case "freebie":
            if (!about) return "";
            return `Free ${about}`.slice(0, HEADLINE_MAX);

        case "other":
        default:
            return (text ?? "").replace(/\s+/g, " ").trim().slice(0, HEADLINE_MAX);
    }
}

export type GuessedKind = {
    kind: OfferKind;
    value: number | null;
    quantity: number | null;
    item: string | null;
};

const unclassified: GuessedKind = { kind: "other", value: null, quantity: null, item: null };

// Reading an existing headline back into a type. The first rule that
// matches wins, and the order matters: "£1 off pints" is money off, not a
// £1 price. The same rules run in the migration's backfill, so a change
// here is a change there.
//
// A row these rules would classify into a shape the database refuses —
// an item over 24 characters, a percentage over 100 — stays "other".
export function guessKind(headline: string | null | undefined): GuessedKind {
    const text = (headline ?? "").replace(/\s+/g, " ").trim();

    if (!text) return unclassified;

    // "£10 credit" is not a £10 price.
    if (/credit$/i.test(text)) return unclassified;

    const percent = text.match(/^(\d+)\s*%\s*off(?:er)?\s*(.*)$/i);
    if (percent) {
        const value = Number(percent[1]);
        return value >= 1 && value <= 100
            ? withinShape({ kind: "percent_off", value, quantity: null, item: rest(percent[2]) })
            : unclassified;
    }

    const moneyOff = text.match(/^£([\d.]+)\s*off\s*(.*)$/i);
    if (moneyOff) {
        const value = Number(moneyOff[1]);
        return value > 0
            ? withinShape({ kind: "money_off", value, quantity: null, item: rest(moneyOff[2]) })
            : unclassified;
    }

    if (/^2\s+for\s+1\b/i.test(text)) {
        const on = text.match(/^2\s+for\s+1\s+(?:on\s+)?(.+)$/i);
        return withinShape({ kind: "two_for_one", value: null, quantity: null, item: rest(on?.[1] ?? "") });
    }

    const multi = text.match(/^(\d+)\s+for\s+£([\d.]+)$/i);
    if (multi) {
        const quantity = Number(multi[1]);
        const value = Number(multi[2]);
        return quantity >= 2 && quantity <= 10 && value > 0
            ? { kind: "multi_buy", value, quantity, item: null }
            : unclassified;
    }

    const fixed = text.match(/^£([\d.]+)\s+(.+)$/i);
    if (fixed) {
        const value = Number(fixed[1]);
        return value > 0
            ? withinShape({ kind: "fixed_price", value, quantity: null, item: rest(fixed[2]) }, true)
            : unclassified;
    }

    const free = text.match(/^free\s+(.+)$/i);
    if (free) {
        return withinShape({ kind: "freebie", value: null, quantity: null, item: rest(free[1]) }, true);
    }

    return unclassified;
}

function rest(value: string) {
    const item = value.replace(/\s+/g, " ").trim();

    return item || null;
}

// The database refuses an item over 24 characters, and refuses a missing
// one where the type needs it. Rather than truncate somebody's words, a
// row that doesn't fit stays "other" and can be tidied by hand.
function withinShape(guess: GuessedKind, itemRequired = false): GuessedKind {
    if (guess.item && guess.item.length > ITEM_MAX) return unclassified;
    if (itemRequired && !guess.item) return unclassified;

    return guess;
}

// The known typo, and only that: "20% offer" was always meant to be
// "20% off". Every other existing headline is left exactly as written.
export function correctedHeadline(headline: string): string | null {
    const typo = headline.match(/^(\d+)\s*%\s*offer\s*(.*)$/i);

    if (!typo) return null;

    const item = rest(typo[2]);

    return `${Number(typo[1])}% off${item ? ` ${item}` : ""}`;
}
