import test from "node:test";
import assert from "node:assert/strict";

import { letterAddress, letterDestination, letterTemplate } from "@/lib/letters";

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
        company: "Little Loaf",
        addressLine1: "214 Gloucester Road",
        addressLine2: "Horfield",
        city: "Bristol",
        postcode: "BS7 8NU",
    });
});

test("the envelope goes to the business, whoever we write to inside", () => {
    // "Sam" above "Little Loaf" reads like a letter to somebody's
    // house. The name belongs in the greeting, not on the envelope.
    for (const contact of ["Sam", "Sam Baker", null]) {
        const to = letterAddress({ ...lead, contact_name: contact });

        assert.equal(to?.company, "Little Loaf");
        assert.ok(!JSON.stringify(to).includes("Sam"), `no name on the envelope for "${contact}"`);
    }
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
        "Little Loaf, 214 Gloucester Road, Horfield, Bristol, BS7 8NU",
    );
});

// A template drawn in the Stannp dashboard takes over the page, so the
// words and the generated letterhead are not sent with it — asking for
// two designs at once is how a letter ends up with the letterhead
// printed twice.
test("a template id is only used when it is a number", () => {
    const original = process.env.STANNP_TEMPLATE_ID;

    try {
        process.env.STANNP_TEMPLATE_ID = "4821";
        assert.equal(letterTemplate(), "4821");

        // Anything that is not an id is no id. A half-pasted value
        // would otherwise be sent to Stannp as a template that does not
        // exist, and the letter would fail at the printer.
        for (const bad of ["", "   ", "template-4821", "4821 ", "abc"]) {
            process.env.STANNP_TEMPLATE_ID = bad;
            assert.equal(letterTemplate(), bad.trim() === "4821" ? "4821" : null, `"${bad}"`);
        }

        delete process.env.STANNP_TEMPLATE_ID;
        assert.equal(letterTemplate(), null, "unset means draw it ourselves");
    } finally {
        if (original === undefined) delete process.env.STANNP_TEMPLATE_ID;
        else process.env.STANNP_TEMPLATE_ID = original;
    }
});
