import assert from "node:assert/strict";
import { test } from "node:test";

import { previewLink, tokenFromPreviewSegment, unclaimedPreview } from "@/lib/previews";

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

test("a preview link carries the business name in front of the token", () => {
    const token = "fcdbe48a-49fc-450a-9eaa-07fed0b1717f";

    assert.equal(
        previewLink(token, "Amsterdam Dandy"),
        `/business/preview/amsterdam-dandy-${token}`,
    );
    // Whatever the name is made of.
    assert.equal(previewLink(token, "Bob's Café & Deli"), `/business/preview/bob-s-cafe-deli-${token}`);
    assert.equal(previewLink(token, "  "), `/business/preview/${token}`);
    assert.equal(previewLink(token, null), `/business/preview/${token}`);
});

test("the token is read back off the end, name or no name", () => {
    const token = "fcdbe48a-49fc-450a-9eaa-07fed0b1717f";

    assert.equal(tokenFromPreviewSegment(`amsterdam-dandy-${token}`), token);
    // Links sent before the name was in them still work.
    assert.equal(tokenFromPreviewSegment(token), token);
    // A name full of hyphens can't swallow the token.
    assert.equal(tokenFromPreviewSegment(`a-b-c-d-e-f-${token}`), token);
});

test("anything that isn't a token at the end is refused", () => {
    assert.equal(tokenFromPreviewSegment("amsterdam-dandy"), null);
    assert.equal(tokenFromPreviewSegment(""), null);
    assert.equal(tokenFromPreviewSegment("fcdbe48a-49fc-450a-9eaa-07fed0b1717"), null);
    // The right shape but not hex.
    assert.equal(tokenFromPreviewSegment("zzzzzzzz-49fc-450a-9eaa-07fed0b1717f"), null);
});
