import assert from "node:assert/strict";
import { test } from "node:test";

import { approvalLabel, statusLabel } from "@/lib/business-status";

test("pending only reads as pending once they have asked", () => {
    // Before sending, nothing is pending: the page is theirs and nobody
    // is looking at it. "Pending approval" told them to wait for us.
    assert.equal(statusLabel("pending", false), "Not sent yet");
    assert.equal(statusLabel("pending", true), "Pending approval");
});

test("every other status reads the same either way", () => {
    for (const status of ["approved", "rejected", "suspended"]) {
        assert.equal(statusLabel(status, false), approvalLabel(status));
        assert.equal(statusLabel(status, true), approvalLabel(status));
    }
});
