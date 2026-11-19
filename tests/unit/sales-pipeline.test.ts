import assert from "node:assert/strict";
import { test } from "node:test";

import {
    dueDate,
    dueToday,
    followUpDue,
    letterDue,
    whenSaid,
    FOLLOW_UP_AFTER_DAYS,
    LETTER_AFTER_DAYS,
    OPEN_STAGES,
    STAGES,
} from "@/lib/sales-pipeline";

const now = new Date("2026-11-18T09:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

test("a follow-up is due four days after the first email, not before", () => {
    const { followUp } = dueToday(
        [
            { id: "a", name: "Three days ago", stage: "emailed", can_email: true, last_touch: daysAgo(3), first_sent_at: daysAgo(3), follow_up_sent_at: null },
            { id: "b", name: "Four days ago", stage: "emailed", can_email: true, last_touch: daysAgo(4), first_sent_at: daysAgo(4), follow_up_sent_at: null },
        ],
        now,
    );

    assert.deepEqual(followUp.map((lead) => lead.id), ["b"]);
});

test("a fortnight of silence becomes a letter", () => {
    const { letter } = dueToday(
        [
            { id: "a", name: "Followed up, still quiet", stage: "followed_up", can_email: true, last_touch: daysAgo(14), first_sent_at: daysAgo(14), follow_up_sent_at: daysAgo(14) },
            { id: "b", name: "Followed up last week", stage: "followed_up", can_email: true, last_touch: daysAgo(7), first_sent_at: daysAgo(7), follow_up_sent_at: daysAgo(7) },
        ],
        now,
    );

    assert.deepEqual(letter.map((lead) => lead.id), ["a"]);
});

test("a lead we may not email is still due a letter", () => {
    // The reason a letter is in the sequence at all: posting something
    // needs no consent, so a sole trader is reachable this way and only
    // this way.
    const { followUp, letter } = dueToday(
        [{ id: "a", name: "Sole trader", stage: "preview", can_email: false, last_touch: daysAgo(20), first_sent_at: null, follow_up_sent_at: null }],
        now,
    );

    assert.equal(followUp.length, 0);
    assert.deepEqual(letter.map((lead) => lead.id), ["a"]);
});

test("a lead that has finished is never due anything", () => {
    const finished = ["claimed", "not_interested", "dead"].map((stage, index) => ({
        id: String(index),
        name: stage,
        stage,
        can_email: true,
        last_touch: daysAgo(90),
        first_sent_at: daysAgo(90),
        follow_up_sent_at: daysAgo(90),
    }));

    const { followUp, letter } = dueToday(finished, now);

    assert.equal(followUp.length, 0);
    assert.equal(letter.length, 0);
});

test("a lead nobody has touched is not chased", () => {
    const { followUp, letter } = dueToday(
        [{ id: "a", name: "Imported, never written to", stage: "new", can_email: true, last_touch: null, first_sent_at: null, follow_up_sent_at: null }],
        now,
    );

    assert.equal(followUp.length, 0);
    assert.equal(letter.length, 0);
});

test("the open stages are the ones still in play", () => {
    assert.ok(OPEN_STAGES.includes("emailed"));
    assert.ok(!OPEN_STAGES.includes("claimed"));
    assert.ok(!OPEN_STAGES.includes("dead"));

    // Was a count, which only recorded that somebody once counted. The
    // thing worth holding is the order: following them is what makes
    // the name half-familiar, so it has to happen before the email and
    // after there is a page to point at.
    const order = STAGES.map((stage) => stage.key);

    assert.ok(order.indexOf("social") > order.indexOf("preview"), "after the page exists");
    assert.ok(order.indexOf("social") < order.indexOf("emailed"), "before we write");
});

// A From address that is only a domain used to count as configured, so
// the Send button lit up and the send failed at Resend — which reads as
// the queue being broken rather than a setting being half written.
test("the outreach sender has to be an address, not a domain", async () => {
    const { outreachSender } = await import("@/lib/outreach-queue");
    const key = "OUTREACH_EMAIL_FROM";
    const before = process.env[key];

    try {
        for (const bad of ["", "   ", "team.promotello.com", "harry@", "@promotello.com", "Harry"]) {
            process.env[key] = bad;
            assert.equal(outreachSender(), null, `"${bad}" is not a From address`);
        }

        for (const good of ["harry@team.promotello.com", "Harry at Promotello <harry@team.promotello.com>"]) {
            process.env[key] = good;
            assert.equal(outreachSender(), good);
        }
    } finally {
        if (before === undefined) delete process.env[key];
        else process.env[key] = before;
    }
});

// The rule reads what was sent, not what the stage says. A stage can be
// dragged by hand; outreach_messages records the send itself.
test("a follow-up stops being due once it has gone", () => {
    const sameLead = {
        id: "a",
        name: "Joe's Bakery",
        stage: "emailed",
        can_email: true,
        last_touch: daysAgo(6),
        first_sent_at: daysAgo(6),
    };

    const { followUp: waiting } = dueToday([{ ...sameLead, follow_up_sent_at: null }], now);
    assert.deepEqual(waiting.map((lead) => lead.id), ["a"], "due while nothing has gone");

    const { followUp: done } = dueToday([{ ...sameLead, follow_up_sent_at: daysAgo(1) }], now);
    assert.equal(done.length, 0, "not due once it has");
});

test("a lead whose first email never went is not followed up", () => {
    // The stage says emailed, which somebody could have set by hand.
    // Nothing was sent, so there is nothing to follow.
    const { followUp } = dueToday(
        [{
            id: "a",
            name: "Moved by hand",
            stage: "emailed",
            can_email: true,
            last_touch: daysAgo(9),
            first_sent_at: null,
            follow_up_sent_at: null,
        }],
        now,
    );

    assert.equal(followUp.length, 0);
});

test("a lead left in Following them is still due a letter", () => {
    // The stage was added to the board without being added to the rule,
    // so a sole trader parked there — reachable by post and nothing
    // else — was invisible to it and would have sat there for good.
    const { letter } = dueToday(
        [{ id: "a", name: "Followed, never written to", stage: "social", can_email: false, last_touch: daysAgo(20), first_sent_at: null, follow_up_sent_at: null }],
        now,
    );

    assert.deepEqual(letter.map((lead) => lead.id), ["a"]);
});

test("the words on the lead page agree with the rule that fires", () => {
    // These are the two halves of the same promise: the page says when
    // something comes due and the rule decides when it has. Drifting
    // apart is the failure nobody would notice.
    const first = daysAgo(FOLLOW_UP_AFTER_DAYS);

    assert.equal(followUpDue(first, now), true);
    assert.equal(followUpDue(daysAgo(FOLLOW_UP_AFTER_DAYS - 1), now), false);

    const { followUp } = dueToday(
        [{ id: "a", name: "Due today", stage: "emailed", can_email: true, last_touch: first, first_sent_at: first, follow_up_sent_at: null }],
        now,
    );

    assert.deepEqual(followUp.map((lead) => lead.id), ["a"]);

    assert.equal(letterDue(daysAgo(LETTER_AFTER_DAYS), now), true);
    assert.equal(letterDue(daysAgo(LETTER_AFTER_DAYS - 1), now), false);
});

test("nothing is due when nothing has been sent", () => {
    assert.equal(followUpDue(null, now), false);
    assert.equal(letterDue(null, now), false);
});

test("how long ago is said the way somebody would say it", () => {
    assert.equal(whenSaid(daysAgo(0), now), "today");
    assert.equal(whenSaid(daysAgo(1), now), "yesterday");
    assert.equal(whenSaid(daysAgo(6), now), "6 days ago");
    assert.equal(whenSaid(daysAgo(21), now), "3 weeks ago");
    assert.equal(whenSaid(daysAgo(90), now), "3 months ago");
});

test("the day a thing comes due is a date, not a countdown", () => {
    // A countdown written into the page goes stale the moment the tab is
    // left open; a date does not.
    assert.equal(dueDate("2026-11-18T09:00:00Z", FOLLOW_UP_AFTER_DAYS), "22 November");
    assert.equal(dueDate("2026-11-18T09:00:00Z", LETTER_AFTER_DAYS), "2 December");
});

test("being followed counts as a touch, so the clock starts", () => {
    // The stage and the rule both knew about "social"; the list of what
    // counts as a touch did not, so the lead had no age and was skipped
    // by the very rule that was meant to catch it.
    const { letter } = dueToday(
        [{ id: "a", name: "Followed and forgotten", stage: "social", can_email: false, last_touch: daysAgo(20), first_sent_at: null, follow_up_sent_at: null }],
        now,
    );

    assert.deepEqual(letter.map((lead) => lead.id), ["a"]);
});
