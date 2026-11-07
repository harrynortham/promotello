import assert from "node:assert/strict";
import { test } from "node:test";

import { cardCodeFrom, scannedCodeFrom } from "@/lib/card-code";

test("a scanned card QR gives up its code", () => {
    assert.equal(cardCodeFrom("https://promotello.com/stamp/4F8A2C91D0"), "4F8A2C91D0");
    assert.equal(cardCodeFrom("http://localhost:3000/stamp/4f8a2c91d0"), "4F8A2C91D0");
    assert.equal(cardCodeFrom("  https://promotello.com/stamp/4F8A2C91D0  "), "4F8A2C91D0");
});

test("a code read out and typed in is a code", () => {
    assert.equal(cardCodeFrom("4F8A2C91D0"), "4F8A2C91D0");
    assert.equal(cardCodeFrom("4f8a2c91d0"), "4F8A2C91D0");
});

test("anything else is not a card", () => {
    // A QR from somewhere else entirely, which is what a camera will
    // mostly see while it is being pointed at the right thing.
    assert.equal(cardCodeFrom("https://example.com"), null);
    assert.equal(cardCodeFrom("https://promotello.com/q/abc12345"), null);
    assert.equal(cardCodeFrom("WIFI:S:Cafe;T:WPA;P:hunter2;;"), null);
    assert.equal(cardCodeFrom(""), null);
});

test("a scanned voucher QR gives up its code", () => {
    assert.equal(scannedCodeFrom("redeem", "https://promotello.com/redeem/F009CC920F"), "F009CC920F");
    assert.equal(scannedCodeFrom("redeem", "F009CC920F"), "F009CC920F");
});

test("each scanner reads its own kind of link", () => {
    // A voucher held up to the card scanner is not a card, and the other
    // way round: the wrong page would say the code doesn't exist.
    assert.equal(scannedCodeFrom("redeem", "https://promotello.com/stamp/4F8A2C91D0"), null);
    assert.equal(scannedCodeFrom("stamp", "https://promotello.com/redeem/F009CC920F"), null);
});
