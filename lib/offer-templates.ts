import type { OfferKind } from "@/lib/offer-kinds";

// Offers a business can start from.
//
// The blank offer form asks eight questions at once, and a business that
// has never written one answers them badly or not at all: a title that
// is the discount again, no end date worth having, and nothing about
// when it can be used. The result is a directory of offers nobody
// returns for, which is the thing track B is for.
//
// So the form opens with half a dozen offers that already work, picked
// for the trade. Pressing one fills every field in, and they change
// whatever they like — the point is to argue with a draft rather than to
// face a blank page.
//
// Every one of these is a real shape of offer, not a placeholder. Where
// a template suggests days and times it is because the timing *is* the
// offer: "free pastry before 10am" fills a quiet hour, and the same
// freebie all day is just a thing given away.
//
// Pure, so the set can be held to its own rules by a test
// (tests/unit/offer-templates.test.ts) without a database.

export type OfferTemplate = {
    id: string;
    // The trades it suits, by top-level category slug. Empty suits any:
    // "10% off your first visit" works in a barber and a bookshop.
    categories: string[];
    title: string;
    kind: OfferKind;
    value?: number;
    quantity?: number;
    item?: string;
    description: string;
    terms?: string;
    // 0 is Sunday, matching offers.available_days.
    days?: number[];
    from?: string;
    until?: string;
    // One line on the card saying what this offer is for. Not a
    // description of the offer — they can read that — but the reason a
    // business would pick this one over the one beside it.
    why: string;
};

// What nearly every offer needs saying, and what a business forgets to
// write. Templates that need more say more.
export const DEFAULT_TERMS =
    "One per customer. Show your Promotello code before you pay. Not with any other offer.";

const WEEKDAYS = [1, 2, 3, 4, 5];

export const OFFER_TEMPLATES: OfferTemplate[] = [
    // --- Food and drink ------------------------------------------------
    {
        id: "pastry-before-ten",
        categories: ["food-drink"],
        title: "Free pastry with any hot drink before 10am",
        kind: "freebie",
        item: "pastry",
        description:
            "Order any coffee or tea before ten and take a pastry from the counter on us.",
        days: WEEKDAYS,
        from: "07:00",
        until: "10:00",
        why: "Fills the hour before the morning rush, when the counter is already stocked.",
    },
    {
        id: "two-for-one-afternoon",
        categories: ["food-drink"],
        title: "Two filter coffees for the price of one",
        kind: "two_for_one",
        item: "filter coffee",
        description:
            "Bring somebody with you on a Monday or Tuesday afternoon and the second coffee is on us.",
        days: [1, 2],
        from: "14:00",
        until: "17:00",
        why: "Turns your two quietest afternoons into two people instead of one.",
    },
    {
        id: "free-side-before-five",
        categories: ["food-drink"],
        title: "Free side with any main before 5pm",
        kind: "freebie",
        item: "side",
        description: "Eat before five and choose any side on the house.",
        days: WEEKDAYS,
        from: "12:00",
        until: "17:00",
        why: "Brings the early table in, before the kitchen is under pressure.",
    },
    {
        id: "money-off-two-courses",
        categories: ["food-drink"],
        title: "£5 off two courses, Sunday to Thursday",
        kind: "money_off",
        value: 5,
        item: "two courses",
        description:
            "Two courses from the main menu, five pounds off, any evening from Sunday to Thursday.",
        days: [0, 1, 2, 3, 4],
        why: "The nights the room is half full, without touching your weekend.",
    },

    // --- Health and beauty ---------------------------------------------
    {
        id: "first-cut-off",
        categories: ["health-beauty"],
        title: "£5 off your first appointment",
        kind: "money_off",
        value: 5,
        item: "your first appointment",
        description:
            "Five pounds off the first time you come in, whatever you book.",
        terms: "First visit only. Show your Promotello code when you book or arrive.",
        why: "The hardest booking to win is the first one. This is the only one it discounts.",
    },
    {
        id: "midweek-appointments",
        categories: ["health-beauty", "services"],
        title: "20% off Tuesday and Wednesday appointments",
        kind: "percent_off",
        value: 20,
        description:
            "Book in on a Tuesday or a Wednesday and take a fifth off the price.",
        days: [2, 3],
        why: "Moves people off your full days onto your empty ones.",
    },

    // --- Shopping -------------------------------------------------------
    {
        id: "ten-off-first-visit",
        categories: [],
        title: "10% off your first visit",
        kind: "percent_off",
        value: 10,
        description:
            "A tenth off the first time you come in, on anything you like.",
        terms: "First visit only. Show your Promotello code before you pay.",
        why: "Works anywhere, and it only ever costs you on a customer you did not have.",
    },
    {
        id: "gift-over-thirty",
        categories: ["shopping"],
        title: "A free gift when you spend £30",
        kind: "freebie",
        item: "gift",
        description: "Spend thirty pounds or more and pick something small to take away.",
        terms: "One per customer, while stocks last. Show your Promotello code before you pay.",
        why: "Lifts the basket rather than cutting the price of what was already in it.",
    },

    // --- Things to do ---------------------------------------------------
    {
        id: "two-for-one-midweek",
        categories: ["things-to-do"],
        title: "2 for 1 entry, Monday to Thursday",
        kind: "two_for_one",
        description: "Come midweek and the second ticket is free.",
        days: [1, 2, 3, 4],
        why: "Midweek seats cost the same empty. This fills them in pairs.",
    },

    // --- Services -------------------------------------------------------
    {
        id: "first-booking-off",
        categories: ["services"],
        title: "£10 off your first booking",
        kind: "money_off",
        value: 10,
        item: "your first booking",
        description: "Ten pounds off the first job you book with us.",
        terms: "First booking only. Show your Promotello code when you book.",
        why: "A first job is worth more than the ten pounds, because the second one is free to win.",
    },

    // --- Travel and stays ------------------------------------------------
    {
        id: "late-checkout",
        categories: ["travel-stays"],
        title: "Free late checkout",
        kind: "freebie",
        item: "late checkout",
        description: "Stay in the room until 2pm, at no extra charge.",
        terms: "Subject to availability. Ask when you check in and show your Promotello code.",
        why: "Costs nothing on a day with no one checking in, and it is the thing guests ask for.",
    },
];

// The ones worth showing a business, its own trade first.
//
// Capped, because a page of twenty is the blank form again with extra
// steps. Six is enough to find one worth arguing with.
export const TEMPLATES_SHOWN = 6;

export function templatesFor(
    categorySlug: string | null | undefined,
    limit = TEMPLATES_SHOWN,
): OfferTemplate[] {
    const slug = (categorySlug ?? "").trim();

    const forTrade = slug
        ? OFFER_TEMPLATES.filter((template) => template.categories.includes(slug))
        : [];
    const forAnyone = OFFER_TEMPLATES.filter((template) => template.categories.length === 0);

    // Their trade first, then the ones that suit anybody, then whatever
    // is left — a category with two templates still gets a full set
    // rather than two cards and a gap.
    const rest = OFFER_TEMPLATES.filter(
        (template) => !forTrade.includes(template) && !forAnyone.includes(template),
    );

    return [...forTrade, ...forAnyone, ...rest].slice(0, limit);
}

export function offerTemplate(id: string) {
    return OFFER_TEMPLATES.find((template) => template.id === id) ?? null;
}
