import test from "node:test";
import assert from "node:assert/strict";

import { letterAddress, letterDestination } from "@/lib/letters";

const lead = {
    name: "Little Loaf",
    contact_name: "Sam Baker",
    address_line_1: "214 Gloucester Road",
    address_line_2: "Horfield",
    postcode: "BS7 8NU",
    cities: { name: "Bristol" },
};

test("a letter is addressed from the same parts the page is", () => {
    const to = letterAddress(lead);

    assert.deepEqual(to, {
        firstName: "Sam",
        lastName: "Baker",
        company: "Little Loaf",
        addressLine1: "214 Gloucester Road",
        addressLine2: "Horfield",
        city: "Bristol",
        postcode: "BS7 8NU",
    });
});

test("one name is a first name, not an invented surname", () => {
    assert.equal(letterAddress({ ...lead, contact_name: "Sam" })?.lastName, null);
    assert.equal(letterAddress({ ...lead, contact_name: null })?.firstName, null);
});

test("an address missing a part is not postable at all", () => {
    // Stannp takes the money whether or not the address was complete,
    // so this says no before it costs anything.
    assert.equal(letterAddress({ ...lead, address_line_1: null }), null);
    assert.equal(letterAddress({ ...lead, postcode: null }), null);
    assert.equal(letterAddress({ ...lead, cities: null }), null);
});

test("what is confirmed is the whole address", () => {
    // The thing read out before pressing send has to be the thing
    // printed, or confirming it means nothing.
    assert.equal(
        letterDestination(letterAddress(lead)!),
        "Sam Baker, Little Loaf, 214 Gloucester Road, Horfield, Bristol, BS7 8NU",
    );
});
