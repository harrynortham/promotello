import assert from "node:assert/strict";
import { test } from "node:test";

import {
    FREE_PHOTO_LIMIT,
    PRO_PHOTO_LIMIT,
    photoAlt,
    photoLimit,
    photoUrl,
    reordered,
    type BusinessPhoto,
} from "@/lib/business-photos";

const photos = (count: number): BusinessPhoto[] =>
    Array.from({ length: count }, (_, at) => ({
        id: `p${at}`,
        storage_path: `b/p${at}.jpg`,
        caption: null,
        sort_order: at,
    }));

const order = (list: BusinessPhoto[]) => list.map((photo) => photo.id).join(" ");

test("the plan decides how many", () => {
    assert.equal(photoLimit(false), FREE_PHOTO_LIMIT);
    assert.equal(photoLimit(true), PRO_PHOTO_LIMIT);
    // Must match photo_plan_limit() in 20270222090000. Spelled out
    // rather than derived, so changing one without the other fails
    // here rather than in production.
    assert.equal(FREE_PHOTO_LIMIT, 5);
    assert.equal(PRO_PHOTO_LIMIT, 25);
});

test("a caption is what a screen reader is told", () => {
    assert.equal(photoAlt({ caption: "The counter at 8am" }, "Kerb Coffee", 0), "The counter at 8am");
});

test("without one, the business and the position", () => {
    assert.equal(photoAlt({ caption: null }, "Kerb Coffee", 2), "Kerb Coffee, photo 3");
    assert.equal(photoAlt({ caption: "" }, "Kerb Coffee", 0), "Kerb Coffee, photo 1");
    assert.equal(photoAlt({ caption: "   " }, "Kerb Coffee", 0), "Kerb Coffee, photo 1");
});

test("the last photo can be dragged to the front", () => {
    const moved = reordered(photos(5), 4, 0);

    assert.equal(order(moved), "p4 p0 p1 p2 p3");
});

test("and the first to the back", () => {
    assert.equal(order(reordered(photos(5), 0, 4)), "p1 p2 p3 p4 p0");
});

test("one step either way moves exactly one place", () => {
    assert.equal(order(reordered(photos(4), 1, 2)), "p0 p2 p1 p3");
    assert.equal(order(reordered(photos(4), 2, 1)), "p0 p2 p1 p3");
});

// A gap or a tie is how a list comes back in a different order from the
// one somebody just dragged it into.
test("every position is renumbered from zero, with no gaps", () => {
    const moved = reordered(photos(6), 5, 1);

    assert.deepEqual(moved.map((photo) => photo.sort_order), [0, 1, 2, 3, 4, 5]);
});

test("a list that arrives numbered oddly is straightened out", () => {
    const odd: BusinessPhoto[] = [
        { id: "a", storage_path: "x", caption: null, sort_order: 7 },
        { id: "b", storage_path: "y", caption: null, sort_order: 7 },
        { id: "c", storage_path: "z", caption: null, sort_order: 99 },
    ];

    assert.deepEqual(reordered(odd, 0, 0).map((photo) => photo.sort_order), [0, 1, 2]);
});

test("a move that goes nowhere, or off the end, changes no order", () => {
    for (const [from, to] of [[2, 2], [-1, 0], [0, 9], [9, 0]]) {
        assert.equal(order(reordered(photos(4), from, to)), "p0 p1 p2 p3", `${from} -> ${to}`);
    }
});

test("the url is built once, from the path", () => {
    assert.equal(
        photoUrl("https://example.supabase.co", "abc/photo-1.jpg"),
        "https://example.supabase.co/storage/v1/object/public/business-logos/abc/photo-1.jpg",
    );
});
