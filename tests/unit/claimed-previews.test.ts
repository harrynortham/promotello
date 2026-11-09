import assert from "node:assert/strict";
import { test } from "node:test";

import { awaitingSend, claimedState, type PreviewRow } from "@/app/admin/previews/preview-shared";

function preview(business: Partial<NonNullable<PreviewRow["businesses"]>> | null): PreviewRow {
    return {
        claimed_at: "2026-12-07T10:00:00Z",
        businesses: business
            ? {
                name: "Amsterdam Dandy",
                approval_status: "pending",
                review_requested_at: null,
                closed_at: null,
                logo_url: null,
                cover_image_url: null,
                business_locations: [],
                ...business,
            }
            : null,
    } as unknown as PreviewRow;
}

test("a claimed preview says whose move it is", () => {
    assert.deepEqual(claimedState(preview({})), { label: "Not sent", tone: "them" });

    assert.deepEqual(claimedState(preview({ review_requested_at: "2026-12-07T11:00:00Z" })), {
        label: "Waiting for review",
        tone: "us",
    });

    assert.deepEqual(claimedState(preview({ approval_status: "approved" })), { label: "Live", tone: "live" });
});

test("a business that closed is finished with, not waiting", () => {
    // Deleting an account closes its businesses rather than deleting them,
    // so the preview outlives the business and used to sit in the list as
    // though something were still owed.
    assert.deepEqual(claimedState(preview({ closed_at: "2026-12-07T12:00:00Z" })), {
        label: "Closed",
        tone: "gone",
    });

    // Closed wins over approved: it was live, and now it isn't.
    assert.equal(
        claimedState(preview({ approval_status: "approved", closed_at: "2026-12-07T12:00:00Z" })).label,
        "Closed",
    );

    // And a business that really has gone.
    assert.equal(claimedState(preview(null)).tone, "gone");
});

test("only the ones waiting on them are counted as not sent", () => {
    assert.equal(awaitingSend(preview({})), true);
    assert.equal(awaitingSend(preview({ closed_at: "2026-12-07T12:00:00Z" })), false);
    assert.equal(awaitingSend(preview({ approval_status: "approved" })), false);
    assert.equal(awaitingSend(preview({ review_requested_at: "2026-12-07T11:00:00Z" })), false);
});
