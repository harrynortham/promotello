import assert from "node:assert/strict";
import { test } from "node:test";

import { confirmsName } from "@/lib/close-business";

test("the typed name has to be the business's name", () => {
    assert.equal(confirmsName("Harrys Bar", "Harrys Bar"), true);
    assert.equal(confirmsName("Little Loaf Bakery", "Harrys Bar"), false);
    assert.equal(confirmsName("", "Harrys Bar"), false);
});

test("typing it the way a person would still counts", () => {
    // Case, surrounding space and a double space between words: none of
    // these mean they meant a different business.
    assert.equal(confirmsName("harrys bar", "Harrys Bar"), true);
    assert.equal(confirmsName("  Harrys Bar  ", "Harrys Bar"), true);
    assert.equal(confirmsName("Harrys  Bar", "Harrys Bar"), true);
});

test("a blank business name is never confirmable", () => {
    // Otherwise an empty box would close a business with an empty name.
    assert.equal(confirmsName("", ""), false);
    assert.equal(confirmsName("   ", "   "), false);
});

test("a near miss is a miss", () => {
    assert.equal(confirmsName("Harrys Ba", "Harrys Bar"), false);
    assert.equal(confirmsName("Harrys Bar 2", "Harrys Bar"), false);
});
