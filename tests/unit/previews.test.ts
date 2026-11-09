import assert from "node:assert/strict";
import { test } from "node:test";

import { unclaimedPreview } from "@/lib/previews";

test("a business with an unclaimed preview isn't one the owner runs", () => {
    assert.equal(unclaimedPreview({ business_previews: [{ claimed_at: null }] }), true);
});

test("once it is claimed it is a business like any other", () => {
    assert.equal(unclaimedPreview({ business_previews: [{ claimed_at: "2026-12-07T10:00:00Z" }] }), false);
});

test("a business that was never a preview is left alone", () => {
    // Also the shape everyone who isn't a platform admin sees, since the
    // embedded rows are hidden from them.
    assert.equal(unclaimedPreview({ business_previews: [] }), false);
    assert.equal(unclaimedPreview({ business_previews: null }), false);
    assert.equal(unclaimedPreview({}), false);
});
