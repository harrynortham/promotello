import assert from "node:assert/strict";
import { test } from "node:test";

import {
    POSTER_LAYOUTS,
    REVIEW_LAYOUTS,
    isFollowLayout,
    isLoyaltyLayout,
    isReviewLayout,
} from "@/lib/poster-layouts";
import { POSTER_SIZES, posterSize, sheetSize } from "@/lib/poster-sizes";
import { qrTarget } from "@/lib/qr-target";

const today = "2026-11-24";

// --- The target -------------------------------------------------------

test("a review code opens the Google reviews, and nothing can break it", () => {
    const target = qrTarget({ reviews: true }, today);

    assert.equal(target.kind, "review");
    assert.equal(target.live, true);
    assert.equal(target.problem, null);
});

test("a retired review poster is still retired", () => {
    const target = qrTarget({ reviews: true, archived_at: "2026-11-01T00:00:00Z" }, today);

    assert.equal(target.kind, "retired");
});

test("a code with no target at all is still the business page", () => {
    assert.equal(qrTarget({}, today).kind, "business");
    assert.equal(qrTarget({ reviews: false }, today).kind, "business");
});

// --- The layouts ------------------------------------------------------

test("the three review layouts are the review layouts, and only those", () => {
    assert.deepEqual([...REVIEW_LAYOUTS], ["review_quiet", "review_bold", "review_code_first"]);

    for (const layout of REVIEW_LAYOUTS) {
        assert.equal(isReviewLayout(layout), true);
        // Each kind of sheet says something the others don't, so they
        // must not be offered on each other's codes.
        assert.equal(isFollowLayout(layout), false);
        assert.equal(isLoyaltyLayout(layout), false);
    }
});

test("an offer layout is not a review layout", () => {
    for (const layout of ["classic", "bold", "minimal", "code_first", "follow", "stamp_card"]) {
        assert.equal(isReviewLayout(layout), false, `${layout} should not be a review layout`);
    }
});

test("every layout the designer can offer has a label and a hint", () => {
    for (const option of POSTER_LAYOUTS) {
        assert.ok(option.label.length > 0, `${option.value} needs a label`);
        assert.ok(option.hint.length > 10, `${option.value} needs a hint`);
    }
});

// --- Four per sheet ---------------------------------------------------

test("four A6 cards tile a portrait A4", () => {
    const size = posterSize("a6x4");

    assert.equal(size.copies, 4);
    assert.equal(size.page, "A4 portrait");

    // 105mm twice is 210mm across, 148mm twice is 296mm down: inside an
    // A4's 210 by 297, which is what makes it cut cleanly.
    assert.equal(size.width, "105mm");
    assert.equal(size.height, "148mm");
    assert.deepEqual(sheetSize(size), { width: "210mm", height: "296mm" });
});

test("the sheet is the poster itself when only one is on it", () => {
    assert.deepEqual(sheetSize(posterSize("a4")), { width: "210mm", height: "297mm" });
    assert.deepEqual(sheetSize(posterSize("a5x2")), { width: "296mm", height: "210mm" });
});

test("an unknown size falls back to A4 rather than printing nothing", () => {
    assert.equal(posterSize("a3").value, "a4");
    assert.equal(posterSize(null).value, "a4");
});

test("every size names a page the printer understands", () => {
    for (const size of POSTER_SIZES) {
        assert.match(size.page, /^A[45] (portrait|landscape)$/);
    }
});
