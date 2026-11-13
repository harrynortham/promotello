import assert from "node:assert/strict";
import { test } from "node:test";

import {
    cardSheet,
    cover,
    directorySheet,
    EXAMPLE,
    examplesNeeded,
    offerSheet,
    priceSheet,
    printableName,
    reportSheet,
    SHEETS,
} from "@/lib/sales-pack";

test("the pack is six sheets, and the page draws them in that order", () => {
    assert.equal(SHEETS.length, 6);
    assert.equal(new Set(SHEETS).size, 6);
});

test("a business's own card, offer and report are used where it has them", () => {
    assert.deepEqual(examplesNeeded({ hasCard: true, hasOffer: true, hasReport: true }), {
        card: false,
        offer: false,
        report: false,
    });
});

// A page that has just gone live has no card, no claims and nobody
// through the door yet. It still has to print.
test("an example stands in for each thing a business hasn't got yet", () => {
    assert.deepEqual(examplesNeeded({ hasCard: false, hasOffer: false, hasReport: false }), {
        card: true,
        offer: true,
        report: true,
    });

    assert.deepEqual(examplesNeeded({ hasCard: true, hasOffer: false, hasReport: false }), {
        card: false,
        offer: true,
        report: true,
    });
});

test("the saved PDF is named after the business, and survives a silly name", () => {
    assert.equal(printableName("Quayside Coffee"), "Quayside Coffee - Promotello");
    assert.equal(printableName("Lou's Bar / Grill"), "Lou's Bar Grill - Promotello");
    assert.equal(printableName("  Two   Spaces  "), "Two Spaces - Promotello");
    assert.equal(printableName(null), "Promotello");
    assert.equal(printableName(""), "Promotello");
});

// Everything on the sheets, as one body of text to make claims about.
const words = [
    cover.promise,
    cover.footer,
    ...cover.points.flatMap((point) => [point.heading, point.body]),
    cardSheet.heading,
    cardSheet.problem,
    cardSheet.scanTitle,
    cardSheet.scanHint,
    ...cardSheet.steps,
    ...cardSheet.asides.flatMap((aside) => [aside.heading, aside.body]),
    offerSheet.heading,
    offerSheet.problem,
    ...offerSheet.steps,
    ...offerSheet.asides.flatMap((aside) => [aside.heading, aside.body]),
    directorySheet.heading,
    directorySheet.problem,
    ...directorySheet.places.flatMap((place) => [place.heading, place.body]),
    ...directorySheet.extras,
    priceSheet.heading,
    priceSheet.blurb,
    priceSheet.note,
    reportSheet.heading,
    reportSheet.blurb,
    ...reportSheet.how,
    reportSheet.caution,
    EXAMPLE.label,
    EXAMPLE.report,
];

test("nothing on a sheet is an empty string or a stray space", () => {
    for (const line of words) {
        assert.equal(typeof line, "string");
        assert.equal(line, line.trim());
        assert.ok(line.length > 0);
    }
});

// The word for where staff stand is the counter, and what they use is
// the phone in their pocket. "Till" says a machine we don't sell.
test("the pack never says till, and never asks anybody to install anything", () => {
    for (const line of words) {
        assert.doesNotMatch(line, /\btills?\b/i, line);
        assert.doesNotMatch(line, /\bapp store\b/i, line);
    }
});

// The prices and the feature list are read from lib/billing.ts and
// lib/plan-features.ts, so nothing here may quote a price of its own
// and go stale.
test("no sheet writes a price of its own", () => {
    for (const line of words) {
        assert.doesNotMatch(line, /£\d/, line);
    }
});
