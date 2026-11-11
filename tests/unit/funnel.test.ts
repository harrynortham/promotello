import assert from "node:assert/strict";
import { test } from "node:test";

import {
    FUNNEL_STEPS,
    formatGap,
    funnelRows,
    isFunnelStepId,
    stepLabel,
    stuckByStep,
    type FunnelStep,
} from "@/lib/funnel";

const step = (position: number, reached: number, median_seconds: number | null = null): FunnelStep => ({
    step: FUNNEL_STEPS[position - 1].id,
    label: FUNNEL_STEPS[position - 1].label,
    position,
    reached,
    median_seconds,
});

test("the funnel is the journey, in order, and only once", () => {
    assert.equal(FUNNEL_STEPS.length, 17);
    assert.equal(FUNNEL_STEPS[0].id, "preview_opened");
    assert.equal(FUNNEL_STEPS.at(-1)?.id, "upgraded_to_paid");
    assert.equal(new Set(FUNNEL_STEPS.map((s) => s.id)).size, FUNNEL_STEPS.length);

    assert.equal(isFunnelStepId("logo_added"), true);
    assert.equal(isFunnelStepId("logo"), false);
    assert.equal(isFunnelStepId(null), false);
    assert.equal(stepLabel("qr_poster_downloaded"), "QR poster printed");
});

test("each step is measured against the one before it", () => {
    const rows = funnelRows([step(1, 20), step(2, 10), step(3, 5)]);

    assert.equal(rows[0].conversion, null, "nothing comes before the first step");
    assert.equal(rows[1].conversion, 0.5);
    assert.equal(rows[1].lost, 10);
    assert.equal(rows[2].conversion, 0.5);
});

test("rows arrive in whatever order and come back in step order", () => {
    const rows = funnelRows([step(3, 5), step(1, 20), step(2, 10)]);

    assert.deepEqual(
        rows.map((row) => row.position),
        [1, 2, 3],
    );
});

// Somebody who signs up without ever being sent a preview reaches step 4
// without reaching step 1. A funnel that quietly showed 180% would be
// lying about the shape of the thing.
test("a step can be reached by more businesses than the one before it", () => {
    const rows = funnelRows([step(1, 10), step(2, 0), step(3, 12), step(4, 24)]);

    assert.equal(rows[1].conversion, 0, "nobody went from opened to started");
    assert.equal(rows[2].conversion, null, "and nothing came before them to divide by");
    assert.equal(rows[3].arrivedAnotherWay, true);
    assert.equal(rows[3].conversion, 2);
    assert.equal(rows[0].arrivedAnotherWay, false);
});

test("a gap is said in the biggest unit that still means something", () => {
    assert.equal(formatGap(0), "under 2 minutes");
    assert.equal(formatGap(89), "under 2 minutes");
    assert.equal(formatGap(600), "10 minutes");
    assert.equal(formatGap(3_600), "1 hour");
    assert.equal(formatGap(7_200), "2 hours");
    assert.equal(formatGap(86_400), "1 day");
    assert.equal(formatGap(86_400 * 4.4), "4 days");
    assert.equal(formatGap(null), null);
    assert.equal(formatGap(undefined), null);
});

test("the stuck are gathered by the step they are stuck on, worst first", () => {
    const stuck = [
        { business_id: "a", name: "A", slug: "a", step: "hours_added", label: "Hours added", at: "", waiting_days: 4 },
        { business_id: "b", name: "B", slug: "b", step: "logo_added", label: "Logo added", at: "", waiting_days: 9 },
        { business_id: "c", name: "C", slug: "c", step: "hours_added", label: "Hours added", at: "", waiting_days: 20 },
    ];

    const groups = stuckByStep(stuck);

    // Logo comes before hours in the journey, whatever order they arrived.
    assert.deepEqual(
        groups.map((group) => group.step),
        ["logo_added", "hours_added"],
    );
    assert.equal(groups[0].label, "Logo added");
    assert.deepEqual(
        groups[1].businesses.map((business) => business.name),
        ["C", "A"],
        "the one waiting longest is the one to deal with first",
    );
});
