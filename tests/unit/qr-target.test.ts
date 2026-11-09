import assert from "node:assert/strict";
import { test } from "node:test";

import { needsAttention, qrTarget, todayInUk } from "@/lib/qr-target";

const today = "2026-12-07";

const liveOffer = {
    title: "2 for 1 cocktails",
    approval_status: "approved",
    expires_at: "2026-12-31",
    plan_paused_at: null,
};

test("a code pointing at a live offer opens what it says it does", () => {
    const target = qrTarget({ offers: liveOffer }, today);

    assert.equal(target.kind, "offer");
    assert.equal(target.live, true);
    assert.equal(target.name, "2 for 1 cocktails");
    assert.equal(target.problem, null);
});

test("an offer expiring today is still live", () => {
    const target = qrTarget({ offers: { ...liveOffer, expires_at: today } }, today);

    assert.equal(target.live, true);
});

test("every way an offer stops being live is named", () => {
    const ended = qrTarget({ offers: { ...liveOffer, expires_at: "2026-12-06" } }, today);
    assert.equal(ended.live, false);
    assert.match(ended.problem ?? "", /ended/);

    const waiting = qrTarget({ offers: { ...liveOffer, approval_status: "pending" } }, today);
    assert.equal(waiting.live, false);
    assert.match(waiting.problem ?? "", /reviewed/);

    // Paused beats expired: the plan is the thing to fix first.
    const paused = qrTarget(
        { offers: { ...liveOffer, plan_paused_at: "2026-12-01", expires_at: "2026-12-06" } },
        today,
    );
    assert.equal(paused.live, false);
    assert.match(paused.problem ?? "", /plan/);

    // Each one still names the offer, because the poster does.
    for (const target of [ended, waiting, paused]) {
        assert.equal(target.name, "2 for 1 cocktails");
        assert.equal(target.kind, "offer");
    }
});

test("a deleted offer is still recognised as the poster's subject", () => {
    // The delete takes offer_id with it, so without the remembered title
    // this is indistinguishable from a code made for the business page.
    const target = qrTarget({ former_target: "Free pastry with any coffee" }, today);

    assert.equal(target.kind, "offer");
    assert.equal(target.live, false);
    assert.equal(target.name, "Free pastry with any coffee");
    assert.match(target.problem ?? "", /deleted/);
});

test("a code made for the business page is live and has nothing to say", () => {
    const target = qrTarget({}, today);

    assert.deepEqual(target, { kind: "business", live: true, name: null, problem: null });
});

test("a loyalty card closed to new joiners is not live", () => {
    const open = { name: "Coffee card", is_active: true, closed_at: null };

    assert.equal(qrTarget({ loyalty_programs: open }, today).live, true);

    const closed = qrTarget({ loyalty_programs: { ...open, closed_at: "2026-12-01" } }, today);
    assert.equal(closed.kind, "card");
    assert.equal(closed.live, false);
    assert.match(closed.problem ?? "", /closed/);

    const off = qrTarget({ loyalty_programs: { ...open, is_active: false } }, today);
    assert.equal(off.live, false);
    assert.match(off.problem ?? "", /turned off/);
});

test("a retired code is reported as retired whatever it used to point at", () => {
    const target = qrTarget({ archived_at: "2026-12-01", offers: liveOffer }, today);

    assert.equal(target.kind, "retired");
    assert.equal(target.live, false);
    // The poster is still in a window, which is the whole point of saying so.
    assert.match(target.problem ?? "", /still lands on your page/);
});

test("only a dead target that is still being scanned needs attention", () => {
    const live = qrTarget({ offers: liveOffer }, today);
    const dead = qrTarget({ former_target: "Free pastry" }, today);

    assert.equal(needsAttention(dead, 14), true);
    // Nobody is scanning it, so there is nothing to tell anyone.
    assert.equal(needsAttention(dead, 0), false);
    assert.equal(needsAttention(live, 14), false);
});

test("today is read in the UK, not wherever the server is", () => {
    // 00:30 on 1 July in London is still 23:30 on 30 June in UTC.
    assert.equal(todayInUk(new Date("2026-06-30T23:30:00Z")), "2026-07-01");
    assert.match(todayInUk(), /^\d{4}-\d{2}-\d{2}$/);
});
