// What kind of offer this is, beside the headline the business writes.
//
// The headline stays the thing customers read ("20% off", "Free coffee",
// "2 for £15"). The kind is the fact underneath it, so an offer can be
// filtered, sorted and described to a search engine — none of which can
// be done with a sentence.

export const OFFER_KINDS = [
    "percent_off",
    "money_off",
    "fixed_price",
    "multi_buy",
    "freebie",
    "other",
] as const;

export type OfferKind = (typeof OFFER_KINDS)[number];

export const offerKindLabels: Record<OfferKind, string> = {
    percent_off: "Percentage off",
    money_off: "Money off",
    fixed_price: "A set price",
    multi_buy: "Multi-buy",
    freebie: "Something free",
    other: "Something else",
};

// What the number beside the kind means, for the kinds that have one.
// A multi-buy needs two numbers ("2 for £15"), so it keeps none and
// lives in the headline; a freebie has no number at all.
export const offerKindValueLabels: Partial<Record<OfferKind, string>> = {
    percent_off: "Percent off",
    money_off: "Pounds off",
    fixed_price: "Price",
};

export function kindTakesValue(kind: string): kind is "percent_off" | "money_off" | "fixed_price" {
    return kind in offerKindValueLabels;
}

export function isOfferKind(value: string): value is OfferKind {
    return (OFFER_KINDS as readonly string[]).includes(value);
}

function money(value: number) {
    // £5, not £5.00; £7.50 keeps its pence.
    return `£${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

// The headline a kind and a number suggest. It is only ever a default:
// the business can write "20% off everything" over the top of it.
export function headlineFor(kind: string, value: number | null): string {
    if (value === null || Number.isNaN(value)) return "";

    if (kind === "percent_off") return `${value % 1 === 0 ? value.toFixed(0) : value}% off`;
    if (kind === "money_off") return `${money(value)} off`;
    if (kind === "fixed_price") return money(value);

    return "";
}

// Reading a kind out of a headline someone already wrote. Used to
// backfill the offers that existed before the picker, and to suggest a
// kind for one being written. The first rule that matches wins, so
// "£1 off pints" is money off rather than a £1 price.
export function kindFromHeadline(headline: string): { kind: OfferKind; value: number | null } {
    const text = headline.trim();

    const percent = text.match(/^(\d+(?:\.\d+)?)\s*%\s*off/i);
    if (percent) return { kind: "percent_off", value: Number(percent[1]) };

    const moneyOff = text.match(/^£(\d+(?:\.\d+)?)\s*off/i);
    if (moneyOff) return { kind: "money_off", value: Number(moneyOff[1]) };

    if (/^\d+\s+for\s/i.test(text)) return { kind: "multi_buy", value: null };

    // A bare "£8" is a price; "£8 beard trim" is the same price with the
    // thing named.
    const price = text.match(/^£(\d+(?:\.\d+)?)(?:\s|$)/i);
    if (price) return { kind: "fixed_price", value: Number(price[1]) };

    if (/^free(\s|$)/i.test(text)) return { kind: "freebie", value: null };

    return { kind: "other", value: null };
}
