import assert from "node:assert/strict";
import { test } from "node:test";

import { dueToday, OPEN_STAGES, STAGES } from "@/lib/sales-pipeline";

const now = new Date("2026-11-18T09:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

test("a follow-up is due four days after the first email, not before", () => {
    const { followUp } = dueToday(
        [
            { id: "a", name: "Three days ago", stage: "emailed", can_email: true, last_touch: daysAgo(3) },
            { id: "b", name: "Four days ago", stage: "emailed", can_email: true, last_touch: daysAgo(4) },
        ],
        now,
    );

    assert.deepEqual(followUp.map((lead) => lead.id), ["b"]);
});

test("a fortnight of silence becomes a letter", () => {
    const { letter } = dueToday(
        [
            { id: "a", name: "Followed up, still quiet", stage: "followed_up", can_email: true, last_touch: daysAgo(14) },
            { id: "b", name: "Followed up last week", stage: "followed_up", can_email: true, last_touch: daysAgo(7) },
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
        [{ id: "a", name: "Sole trader", stage: "preview", can_email: false, last_touch: daysAgo(20) }],
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
    }));

    const { followUp, letter } = dueToday(finished, now);

    assert.equal(followUp.length, 0);
    assert.equal(letter.length, 0);
});

test("a lead nobody has touched is not chased", () => {
    const { followUp, letter } = dueToday(
        [{ id: "a", name: "Imported, never written to", stage: "new", can_email: true, last_touch: null }],
        now,
    );

    assert.equal(followUp.length, 0);
    assert.equal(letter.length, 0);
});

test("the open stages are the ones still in play", () => {
    assert.ok(OPEN_STAGES.includes("emailed"));
    assert.ok(!OPEN_STAGES.includes("claimed"));
    assert.ok(!OPEN_STAGES.includes("dead"));
    assert.equal(STAGES.length, 10);
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
