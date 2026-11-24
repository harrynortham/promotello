import assert from "node:assert/strict";
import { test } from "node:test";

import { worthIndexing } from "@/lib/indexing";

// A page we built and nobody has claimed is reachable by anyone we send
// the link to, and is in no listing, no search and no index until its
// business takes it over.

test("a claimed business is indexed", () => {
    assert.equal(worthIndexing({ unclaimed: false }), true);
});

test("a page nobody has claimed is not", () => {
    assert.equal(worthIndexing({ unclaimed: true }), false);
});
