import assert from "node:assert/strict";
import { test } from "node:test";

import {
    editSummary,
    groupByBusiness,
    isImageField,
    shorten,
    type BusinessEditField,
} from "@/lib/business-edits";

test("a save of several fields is said in one line", () => {
    assert.equal(editSummary([]), "nothing");
    assert.equal(editSummary(["name"]), "name");
    assert.equal(editSummary(["name", "description"]), "name and description");
    assert.equal(
        editSummary(["logo_url", "cover_image_url", "name"]),
        "logo, cover image and name",
    );
});

test("the same field twice is still one field", () => {
    assert.equal(editSummary(["name", "name"]), "name");
});

test("the two pictures are read as pictures", () => {
    const fields: BusinessEditField[] = ["name", "description", "logo_url", "cover_image_url"];

    assert.deepEqual(fields.map(isImageField), [false, false, true, true]);
});

test("a paragraph is cut to a line, and nothing says so", () => {
    assert.equal(shorten(null), "—");
    assert.equal(shorten("   "), "—");
    assert.equal(shorten("A short one"), "A short one");
    assert.equal(shorten("x".repeat(200)).length, 140);
    assert.match(shorten("x".repeat(200)), /…$/);
});

test("edits are grouped by business, the most recently edited first", () => {
    const grouped = groupByBusiness([
        { businessId: "a", editedAt: "2026-01-01T00:00:00Z", field: "name" },
        { businessId: "b", editedAt: "2026-06-01T00:00:00Z", field: "name" },
        { businessId: "a", editedAt: "2026-03-01T00:00:00Z", field: "description" },
    ]);

    assert.deepEqual(grouped.map((row) => row.businessId), ["b", "a"]);
    // Inside one business, newest first as well.
    assert.deepEqual(grouped[1].edits.map((edit) => edit.field), ["description", "name"]);
});
