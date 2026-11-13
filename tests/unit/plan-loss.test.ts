import assert from "node:assert/strict";
import { test } from "node:test";

import {
    cameBack,
    cancellationLanded,
    whatStops,
    whatSurvives,
    worthKeeping,
    type Standing,
} from "@/lib/plan-loss";

const standing = (over: Partial<Standing> = {}): Standing => ({
    tier: "pro",
    liveOffers: 1,
    posters: 1,
    followers: 0,
    cardHolders: 0,
    hasCard: false,
    automationsOn: 0,
    ...over,
});

const headings = (list: { heading: string }[]) => list.map((item) => item.heading);

test("a business with one offer and nothing else is not told it loses offers", () => {
    const stops = headings(whatStops(standing()));

    assert.ok(!stops.some((heading) => heading.includes("directory")));
    assert.ok(!stops.some((heading) => heading.includes("follower")));
    assert.ok(stops.includes("Google review prompts stop"));
});

test("the offers it would lose are counted, and the one it keeps is not", () => {
    const [first] = whatStops(standing({ liveOffers: 5 }));

    assert.equal(first.heading, "4 offers come off the directory");
    assert.match(first.body, /newest offer live/);
});

test("one of two is said in the singular", () => {
    const [first] = whatStops(standing({ liveOffers: 2 }));

    assert.equal(first.heading, "1 offer comes off the directory");
});

test("followers are counted, singular and plural", () => {
    assert.ok(
        headings(whatStops(standing({ followers: 1 }))).includes("1 follower stops hearing from you"),
    );
    assert.ok(
        headings(whatStops(standing({ followers: 312 }))).includes(
            "312 followers stop hearing from you",
        ),
    );
});

// The whole argument. A running card is deliberately left alone on Free
// (20261025100000_loyalty_cards.sql), so the loss is the next one.
test("the card is never said to stop — the loss is that it is the last one", () => {
    const stops = whatStops(standing({ hasCard: true, cardHolders: 12 }));
    const card = stops.find((stop) => stop.heading.includes("stamp card"));

    assert.ok(card, "the card is spoken about");
    assert.equal(card!.heading, "This is the last stamp card you can start");
    assert.match(card!.body, /12 people are collecting on carries on/);
    assert.match(card!.body, /nobody loses a stamp/);

    for (const stop of stops) {
        assert.doesNotMatch(stop.heading, /card (stops|ends|freezes)/i, stop.heading);
        assert.doesNotMatch(stop.body, /stamps? (stop|freeze)/i, stop.body);
    }
});

test("a business with no card is told nothing about one", () => {
    const stops = headings(whatStops(standing()));
    const survives = headings(whatSurvives(standing()));

    assert.ok(!stops.some((heading) => heading.includes("stamp card")));
    assert.ok(!survives.some((heading) => heading.includes("stamp card")));
});

test("what carries on is said beside what doesn't, and says the card keeps collecting", () => {
    const survives = whatSurvives(standing({ hasCard: true, cardHolders: 3 }));

    assert.deepEqual(headings(survives), [
        "Your page stays up",
        "The stamp card keeps collecting",
        "Nothing is deleted",
    ]);
    assert.match(survives[1].body, /keep stamping/);
});

test("Growth loses the three things Pro never had", () => {
    const pro = headings(whatStops(standing({ tier: "pro" })));
    const growth = headings(whatStops(standing({ tier: "growth", automationsOn: 2 })));

    for (const heading of ["2 automations switch off", "Quiet hours stop being enforced"]) {
        assert.ok(growth.includes(heading), heading);
        assert.ok(!pro.includes(heading), heading);
    }

    assert.ok(growth.some((heading) => heading.includes("whether any of it worked")));
});

test("automations nobody switched on are still a loss, said without a number", () => {
    const growth = headings(whatStops(standing({ tier: "growth", automationsOn: 0 })));

    assert.ok(growth.includes("Automations switch off"));
});

test("what they are walking away from reads as a sentence", () => {
    assert.equal(
        worthKeeping(standing({ cardHolders: 41, followers: 312, liveOffers: 3 })),
        "41 people are collecting stamps with you, 312 people follow you for new offers and 3 offers are live.",
    );

    assert.equal(
        worthKeeping(standing({ cardHolders: 1, liveOffers: 0 })),
        "1 person is collecting stamps with you.",
    );

    // A business with nothing yet is not told it has nothing.
    assert.equal(worthKeeping(standing({ liveOffers: 0 })), null);
});

// ---------------------------------------------------------------------------
// A year in the life of a subscription, through the webhook's eyes
// ---------------------------------------------------------------------------

const state = (status: string, cancelling = false) => ({
    status,
    cancel_at_period_end: cancelling,
});

test("starting, trialing, renewing and paying again are not an ending", () => {
    assert.equal(cancellationLanded(null, state("trialing")), false);
    assert.equal(cancellationLanded(state("trialing"), state("active")), false);
    assert.equal(cancellationLanded(state("active"), state("active")), false);
    assert.equal(cancellationLanded(state("active"), state("past_due")), false);
    assert.equal(cancellationLanded(state("past_due"), state("active")), false);
});

test("the portal's cancel is an ending, and only the first time it is seen", () => {
    assert.equal(cancellationLanded(state("active"), state("active", true)), true);
    assert.equal(cancellationLanded(state("active", true), state("active", true)), false);
});

test("a subscription that has already stopped is an ending, once", () => {
    assert.equal(cancellationLanded(state("active"), state("canceled")), true);
    assert.equal(cancellationLanded(state("canceled"), state("canceled")), false);
    // Stripe can tell us about one we never saw alive.
    assert.equal(cancellationLanded(null, state("canceled")), true);
});

test("coming back is paying with no end date on it", () => {
    assert.equal(cameBack(state("active")), true);
    assert.equal(cameBack(state("trialing")), true);
    assert.equal(cameBack(state("active", true)), false);
    assert.equal(cameBack(state("canceled")), false);
});
