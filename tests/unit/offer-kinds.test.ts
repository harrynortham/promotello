import assert from "node:assert/strict";
import { test } from "node:test";

import {
    OFFER_KINDS,
    correctedHeadline,
    guessKind,
    isOfferKind,
    kindFromSlug,
    money,
    offerHeadline,
    slugOfKind,
    type OfferKind,
} from "@/lib/offer-kinds";

test("every type is written once, and the filter skips the escape hatch", () => {
    assert.equal(OFFER_KINDS.length, 7);
    assert.equal(new Set(OFFER_KINDS.map((spec) => spec.kind)).size, 7);

    const offered = OFFER_KINDS.filter((spec) => spec.slug);
    assert.equal(offered.length, 6, "six real types in the filter");
    assert.equal(OFFER_KINDS.find((spec) => spec.kind === "other")?.slug, null);
});

test("a slug goes out and comes back", () => {
    for (const spec of OFFER_KINDS) {
        if (!spec.slug) continue;

        assert.equal(slugOfKind(spec.kind), spec.slug);
        assert.equal(kindFromSlug(spec.slug), spec.kind);
    }

    assert.equal(kindFromSlug("nonsense"), null);
    assert.equal(kindFromSlug(null), null);
    assert.equal(kindFromSlug(undefined), null);
    assert.equal(isOfferKind("freebie"), true);
    assert.equal(isOfferKind("free"), false);
});

test("money reads the way a price is written", () => {
    assert.equal(money(5), "£5");
    assert.equal(money(5.0), "£5");
    assert.equal(money(2.5), "£2.50");
    assert.equal(money(2.555), "£2.56");
    assert.equal(money(15), "£15");
});

test("the headline is built from the type and its parts", () => {
    assert.equal(offerHeadline({ kind: "percent_off", value: 20 }), "20% off");
    assert.equal(offerHeadline({ kind: "percent_off", value: 20, item: "pints" }), "20% off pints");

    assert.equal(offerHeadline({ kind: "money_off", value: 5 }), "£5 off");
    assert.equal(offerHeadline({ kind: "money_off", value: 2.5, item: "pints" }), "£2.50 off pints");

    assert.equal(offerHeadline({ kind: "two_for_one" }), "2 for 1");
    assert.equal(offerHeadline({ kind: "two_for_one", item: "cocktails" }), "2 for 1 on cocktails");

    assert.equal(offerHeadline({ kind: "multi_buy", quantity: 2, value: 15 }), "2 for £15");
    assert.equal(offerHeadline({ kind: "multi_buy", quantity: 3, value: 2.5 }), "3 for £2.50");

    assert.equal(offerHeadline({ kind: "fixed_price", value: 8, item: "beard trim" }), "£8 beard trim");
    assert.equal(offerHeadline({ kind: "freebie", item: "pastry" }), "Free pastry");
    assert.equal(offerHeadline({ kind: "other", text: "3rd half price" }), "3rd half price");
});

test("half a type is not half a headline", () => {
    // The form shows this as they type, so it stays empty until there is
    // something true to say.
    assert.equal(offerHeadline({ kind: "percent_off" }), "");
    assert.equal(offerHeadline({ kind: "percent_off", value: "" }), "");
    assert.equal(offerHeadline({ kind: "money_off", value: 0 }), "");
    assert.equal(offerHeadline({ kind: "multi_buy", quantity: 2 }), "");
    assert.equal(offerHeadline({ kind: "multi_buy", value: 15 }), "");
    assert.equal(offerHeadline({ kind: "multi_buy", quantity: 1, value: 15 }), "");
    assert.equal(offerHeadline({ kind: "fixed_price", value: 8 }), "", "a price of what?");
    assert.equal(offerHeadline({ kind: "freebie" }), "");
    assert.equal(offerHeadline({ kind: "other" }), "");

    // 2 for 1 needs nothing but itself.
    assert.equal(offerHeadline({ kind: "two_for_one" }), "2 for 1");
});

test("an item arrives tidy, however it was typed", () => {
    assert.equal(offerHeadline({ kind: "freebie", item: "  pastry  " }), "Free pastry");
    assert.equal(offerHeadline({ kind: "freebie", item: "a\n side" }), "Free a side");
    assert.equal(
        offerHeadline({ kind: "percent_off", value: 10, item: "x".repeat(40) }),
        `10% off ${"x".repeat(24)}`,
        "trimmed to what the database takes",
    );
});

// The headlines in docs/OFFER-TYPES.md, which are what is actually live.
test("the live headlines classify the way the doc says", () => {
    const expected: [string, OfferKind, number | null, string | null][] = [
        ["20% off", "percent_off", 20, null],
        ["20% offer", "percent_off", 20, null],
        ["10% off", "percent_off", 10, null],
        ["50% off", "percent_off", 50, null],
        ["£5 off", "money_off", 5, null],
        ["£10 off", "money_off", 10, null],
        ["£1 off pints", "money_off", 1, "pints"],
        ["£5 off pp", "money_off", 5, "pp"],
        ["2 for £15", "multi_buy", 15, null],
        ["2 for £20", "multi_buy", 20, null],
        ["£1 cones", "fixed_price", 1, "cones"],
        ["£8 beard trim", "fixed_price", 8, "beard trim"],
        ["£5 tickets", "fixed_price", 5, "tickets"],
        ["Free coffee", "freebie", null, "coffee"],
        ["Free late checkout", "freebie", null, "late checkout"],
        ["Free add-on", "freebie", null, "add-on"],
        ["2 for 1", "two_for_one", null, null],
        ["2 for 1 on cocktails", "two_for_one", null, "cocktails"],
    ];

    for (const [headline, kind, value, item] of expected) {
        const guess = guessKind(headline);

        assert.equal(guess.kind, kind, headline);
        assert.equal(guess.value, value, headline);
        assert.equal(guess.item, item, headline);
    }

    assert.equal(guessKind("2 for £15").quantity, 2);
});

test("what the rules can't read stays other, rather than guessing", () => {
    for (const headline of ["3rd half price", "Flight for £8", "3rd night free", "", "   "]) {
        assert.equal(guessKind(headline).kind, "other", headline);
    }

    // A £10 price it is not.
    assert.equal(guessKind("£10 credit").kind, "other");

    // Shapes the database would refuse.
    assert.equal(guessKind("120% off").kind, "other", "over 100");
    assert.equal(guessKind(`20% off ${"x".repeat(40)}`).kind, "other", "item too long");
    assert.equal(guessKind("£8").kind, "other", "a price of nothing");
    assert.equal(guessKind("Free").kind, "other", "free what?");
    assert.equal(guessKind("11 for £5").kind, "other", "more than a multi-buy");
    assert.equal(guessKind("1 for £5").kind, "other");
});

test("money off comes before a price, whatever the order of the rules", () => {
    // "£1 off pints" is a pound off pints, not a £1 item called "off
    // pints". This is the ordering the doc calls out by name.
    const guess = guessKind("£1 off pints");

    assert.equal(guess.kind, "money_off");
    assert.equal(guess.value, 1);
    assert.equal(guess.item, "pints");
});

test("only the known typo is rewritten", () => {
    assert.equal(correctedHeadline("20% offer"), "20% off");
    assert.equal(correctedHeadline("15% offer pints"), "15% off pints");
    assert.equal(correctedHeadline("20% off"), null);
    assert.equal(correctedHeadline("Free coffee"), null);
    assert.equal(correctedHeadline("£5 off"), null);
});

test("a guess rebuilds the headline it came from", () => {
    for (const headline of ["20% off", "£5 off", "2 for 1", "2 for £15", "£8 beard trim", "Free pastry"]) {
        const guess = guessKind(headline);

        assert.equal(
            offerHeadline({ kind: guess.kind, value: guess.value, quantity: guess.quantity, item: guess.item }),
            headline,
            headline,
        );
    }
});
