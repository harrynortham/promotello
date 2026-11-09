import assert from "node:assert/strict";
import { test } from "node:test";

import { isBusinessDestination, safeNextPath } from "@/lib/redirects";

test("the business side is every page under /business", () => {
    assert.equal(isBusinessDestination("/onboarding"), true);
    assert.equal(isBusinessDestination("/business/dashboard"), true);
    // The one that was missed: claiming a preview is a business signing up.
    assert.equal(isBusinessDestination("/business/preview/amsterdam-dandy-fcdbe48a"), true);
    assert.equal(isBusinessDestination("/business"), true);
});

test("the public directory is a customer reading about a business", () => {
    assert.equal(isBusinessDestination("/businesses/amsterdam-dandy-bristol-34qpuc"), false);
    assert.equal(isBusinessDestination("/dashboard"), false);
    assert.equal(isBusinessDestination("/offers/something"), false);
    assert.equal(isBusinessDestination("/account"), false);
});

test("a preview link is still an allowed destination", () => {
    const next = "/business/preview/amsterdam-dandy-fcdbe48a-49fc-450a-9eaa-07fed0b1717f";

    assert.equal(safeNextPath(next), next);
    assert.equal(safeNextPath("https://example.com"), null);
});
