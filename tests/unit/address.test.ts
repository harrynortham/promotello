import test from "node:test";
import assert from "node:assert/strict";

import { addressParts } from "@/lib/address";

// The second line is the locality — what goes between the street and the
// town on an envelope. The region is our own area, which is a different
// thing, and printing both gave an address nobody would write.
test("the locality is used where there is one", () => {
    assert.deepEqual(
        addressParts({
            address_line_1: "240 – 242 Gloucester Road",
            address_line_2: "Horfield",
            region: "Gloucester Road",
            city: "Bristol",
            postal_code: "BS7 8NZ",
        }),
        ["240 – 242 Gloucester Road", "Horfield", "Bristol", "BS7 8NZ"],
    );
});

test("the area stands in where there is not", () => {
    // It is the only neighbourhood we hold for them, and it is how that
    // business would write it.
    assert.deepEqual(
        addressParts({
            address_line_1: "Narrow Quay",
            address_line_2: null,
            region: "Harbourside",
            city: "Bristol",
            postal_code: "BS1 5DB",
        }),
        ["Narrow Quay", "Harbourside", "Bristol", "BS1 5DB"],
    );

    // Blank counts as absent, not as a line of nothing.
    assert.deepEqual(
        addressParts({ address_line_1: "Narrow Quay", address_line_2: "   ", region: "Harbourside" }),
        ["Narrow Quay", "Harbourside"],
    );
});

test("a repeat appears once", () => {
    assert.deepEqual(
        addressParts({
            address_line_1: "Gloucester Road",
            address_line_2: "Gloucester Road",
            city: "Bristol",
        }),
        ["Gloucester Road", "Bristol"],
    );
});

test("nothing at all is no lines rather than empty ones", () => {
    assert.deepEqual(addressParts(null), []);
    assert.deepEqual(addressParts({}), []);
});
