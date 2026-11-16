import assert from "node:assert/strict";
import { test } from "node:test";

import {
    DEFAULT_TITLE_EXAMPLE,
    offerTitleExample,
    type CategoryGroup,
} from "@/lib/categories";

const group = (id: string, slug: string, subs: { id: string; slug: string }[] = []): CategoryGroup =>
    ({
        id,
        slug,
        name: slug,
        parent_id: null,
        description: null,
        image_url: null,
        sort_order: 0,
        is_active: true,
        subcategories: subs.map((sub) => ({
            ...sub,
            name: sub.slug,
            parent_id: id,
            description: null,
            image_url: null,
            sort_order: 0,
            is_active: true,
        })),
    }) as unknown as CategoryGroup;

const groups = [
    group("f", "food-drink", [{ id: "cafe", slug: "cafes-coffee" }]),
    group("s", "services", [{ id: "bikes", slug: "bike-repair" }]),
    group("h", "health-beauty", [
        { id: "barber", slug: "hair-barbers" },
        { id: "optician", slug: "opticians" },
    ]),
    group("d", "things-to-do", [
        { id: "cinema", slug: "cinema-theatre" },
        { id: "gym", slug: "fitness-sport" },
    ]),
    group("t", "travel-stays"),
];

// The placeholder is the one piece of copy a business reads while
// deciding what to write. An example from somebody else's trade is
// worse than none.
test("the example offer comes from the business's own trade", () => {
    assert.equal(offerTitleExample("cafe", groups), "20% off your next coffee");
    assert.equal(offerTitleExample("bikes", groups), "10% off your first booking");

    // A top-level category chosen directly works the same way.
    assert.equal(offerTitleExample("t", groups), "10% off a midweek stay");
});

// A group holds trades that have little in common — the optician is
// filed beside the barber, the gym beside the cinema — so the example
// has to make sense to all of them.
test("the example fits every trade in its group, not just the first", () => {
    assert.equal(offerTitleExample("barber", groups), offerTitleExample("optician", groups));
    assert.equal(offerTitleExample("cinema", groups), offerTitleExample("gym", groups));

    // Nothing that only a hairdresser or only a box office could offer.
    assert.doesNotMatch(offerTitleExample("optician", groups), /cut/i);
    assert.doesNotMatch(offerTitleExample("gym", groups), /ticket/i);
});

test("a category we cannot place still gets an example", () => {
    assert.equal(offerTitleExample(null, groups), DEFAULT_TITLE_EXAMPLE);
    assert.equal(offerTitleExample("nothing-like-it", groups), DEFAULT_TITLE_EXAMPLE);
    assert.notEqual(DEFAULT_TITLE_EXAMPLE, "");
});
