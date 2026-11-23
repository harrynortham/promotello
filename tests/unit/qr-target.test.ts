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

// A card poster is for somebody who is not holding one yet, and on Free
// that is exactly who is turned away
// (20270120090000_a_card_on_free_takes_no_new_members.sql). The card
// still works for everyone already collecting; the poster does not.
test("a card poster on the Free plan has nothing to offer a passer-by", () => {
    const open = { name: "Coffee card", is_active: true, closed_at: null };

    const onPro = qrTarget({ loyalty_programs: open }, today, true);
    assert.equal(onPro.live, true);
    assert.equal(onPro.problem, null);

    // The poster is not broken: a scan opens the card it was printed
    // for. So it keeps live, and nothing offers to repoint it — a
    // printed stamp-card poster sent to an offer instead would make
    // less sense than leaving it alone.
    const onFree = qrTarget({ loyalty_programs: open }, today, false);
    assert.equal(onFree.live, true);
    assert.equal(onFree.problem, null);
    assert.match(onFree.limited!, /isn't taking new members/);
    assert.match(onFree.limited!, /back on Pro/);

    // An offer poster is not affected: apply_business_plan pauses the
    // offer itself, and that is already said in its own words.
    const offerOnFree = qrTarget({ offers: liveOffer }, today, false);
    assert.equal(offerOnFree.live, true);
    assert.ok(!offerOnFree.limited);

    // And the daily "poster pointing nowhere" notice only looks at live
    // and problem (lib/daily-notices.ts), so a card poster on Free is
    // never reported as broken to somebody who cannot fix it.
    assert.ok(onFree.live || !onFree.problem);
});

// A poster that asks to be followed. It does not depend on an offer
// running or a card being open, so there is nothing about it that can
// quietly stop working -- which is the whole job of this function.
test("a follow poster is live for as long as the business is", () => {
    const target = qrTarget({ follows: true }, "2026-11-23");

    assert.equal(target.kind, "follow");
    assert.equal(target.live, true);
    assert.equal(target.problem, null);
});

// The check in the database says a follow code carries neither, but the
// dashboard reads rows written before it existed too.
test("a follow poster is read as one even beside a stale offer row", () => {
    const target = qrTarget(
        {
            follows: true,
            offers: { title: "Old", approval_status: "approved", expires_at: "2020-01-01", plan_paused_at: null },
        },
        "2026-11-23",
    );

    assert.equal(target.kind, "follow");
    assert.equal(target.live, true);
});

// Retiring one still wins: the sheet is in a window either way.
test("a retired follow poster still reads as retired", () => {
    const target = qrTarget({ follows: true, archived_at: "2026-11-01" }, "2026-11-23");

    assert.equal(target.kind, "retired");
    assert.equal(target.live, false);
});
