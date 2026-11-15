import assert from "node:assert/strict";
import { test } from "node:test";

import {
    BUSINESS_REASONS,
    BUSINESS_SUSPENSIONS,
    NOTE_MAX,
    OFFER_REASONS,
    OFFER_SUSPENSIONS,
    declineIsComplete,
    declineLines,
    declineSummary,
    findReason,
    helpAnchor,
    reasonsFor,
    tidyNote,
} from "@/lib/review-reasons";

// The shape the database enforces (20270107090000). A code that doesn't
// match is a decline that fails at the point of saving it, which is the
// worst possible moment to find out.
const SHAPE = /^[a-z][a-z-]{1,39}$/;

const EVERY = [...BUSINESS_REASONS, ...OFFER_REASONS, ...BUSINESS_SUSPENSIONS, ...OFFER_SUSPENSIONS];

test("every code is one the column will accept", () => {
    for (const reason of EVERY) {
        assert.match(reason.code, SHAPE, `${reason.code} would be refused`);
    }
});

test("codes are unique within each list", () => {
    for (const list of [BUSINESS_REASONS, OFFER_REASONS, BUSINESS_SUSPENSIONS, OFFER_SUSPENSIONS]) {
        const codes = list.map((reason) => reason.code);
        assert.equal(new Set(codes).size, codes.length);
    }
});

test("every reason says something to do about it", () => {
    for (const reason of EVERY) {
        assert.ok(reason.label.length > 0, `${reason.code} has no label`);
        assert.ok(reason.fix.length > 0, `${reason.code} has nothing to change`);
    }
});

test("only 'something else' leaves the words to whoever is writing", () => {
    for (const list of [BUSINESS_REASONS, OFFER_REASONS, BUSINESS_SUSPENSIONS, OFFER_SUSPENSIONS]) {
        const blank = list.filter((reason) => reason.says === "");
        assert.deepEqual(blank.map((reason) => reason.code), ["other"]);
    }
});

// The thing being fixed: a decline that doesn't say why. 'other' without
// a note is the old generic decline wearing a code, so it is refused in
// the dialog and in the database.
test("a reason is enough on its own, except 'something else'", () => {
    assert.ok(declineIsComplete("offer", "rejected", "unclear", ""));
    assert.ok(declineIsComplete("business", "rejected", "address", null));

    assert.ok(!declineIsComplete("offer", "rejected", "other", ""));
    assert.ok(!declineIsComplete("offer", "rejected", "other", "   "));
    assert.ok(declineIsComplete("offer", "rejected", "other", "The headline and the terms disagree."));
});

test("a code we don't know is never complete", () => {
    assert.ok(!declineIsComplete("offer", "rejected", "made-up", "with a note"));
    assert.equal(findReason("offer", "rejected", "made-up"), null);
    assert.equal(findReason("offer", "rejected", null), null);
});

test("the lines read cause, then note, then what to change", () => {
    const reason = findReason("offer", "rejected", "hard-to-check")!;
    const lines = declineLines("offer", "rejected", "hard-to-check", "  Staff would have to check the till.  ");

    assert.deepEqual(lines, [reason.says, "Staff would have to check the till.", reason.fix]);
});

test("without a note the cause and the fix still stand alone", () => {
    const reason = findReason("business", "rejected", "thin-profile")!;
    assert.deepEqual(declineLines("business", "rejected", "thin-profile"), [reason.says, reason.fix]);
});

// Everything turned down before this existed. Inventing a cause for it
// would be worse than saying nothing.
test("an old decline with no reason renders nothing to read", () => {
    assert.deepEqual(declineLines("offer", "rejected", null), []);
    assert.deepEqual(declineLines("offer", "rejected", undefined, null), []);
    assert.equal(declineSummary("business", "rejected", null, null), null);
});

test("a note on its own is still shown", () => {
    assert.deepEqual(declineLines("offer", "rejected", null, "We spoke on the phone."), ["We spoke on the phone."]);
});

test("'something else' is the note and nothing else", () => {
    assert.deepEqual(declineLines("offer", "rejected", "other", "Sent twice by mistake."), [
        "Sent twice by mistake.",
        findReason("offer", "rejected", "other")!.fix,
    ]);

    assert.equal(declineSummary("offer", "rejected", "other", "Sent twice by mistake."), "Sent twice by mistake.");
    assert.equal(declineSummary("offer", "rejected", "other", null), null);
});

test("the one-line summary prefers what was written about them", () => {
    assert.equal(
        declineSummary("offer", "rejected", "unclear", "“Up to 50%” reads as half price."),
        "“Up to 50%” reads as half price.",
    );

    assert.equal(declineSummary("offer", "rejected", "unclear", null), findReason("offer", "rejected", "unclear")!.says);
});

test("a note is trimmed, capped and never an empty string", () => {
    assert.equal(tidyNote("  "), null);
    assert.equal(tidyNote(null), null);
    assert.equal(tidyNote(" something "), "something");
    assert.equal(tidyNote("x".repeat(NOTE_MAX + 50))?.length, NOTE_MAX);
});

test("each side has its own list and its own article", () => {
    assert.equal(reasonsFor("business", "rejected"), BUSINESS_REASONS);
    assert.equal(reasonsFor("offer", "rejected"), OFFER_REASONS);
    assert.equal(reasonsFor("business", "suspended"), BUSINESS_SUSPENSIONS);
    assert.equal(reasonsFor("offer", "suspended"), OFFER_SUSPENSIONS);

    assert.equal(helpAnchor("business", "rejected"), "/business/help#business-declined");
    assert.equal(helpAnchor("offer", "rejected"), "/business/help#offer-declined");

    // One article for a suspension, whichever it was: it is the same
    // thing happening, and the same question about getting back.
    assert.equal(helpAnchor("business", "suspended"), "/business/help#suspended");
    assert.equal(helpAnchor("offer", "suspended"), "/business/help#suspended");
});

// Claims that would be false. A decline is read by somebody who has just
// had work turned down, and a sentence that overstates what happened is
// how a fixable decline becomes a cancellation.
test("nothing tells them their work is gone", () => {
    for (const reason of EVERY) {
        const words = `${reason.says} ${reason.fix}`.toLowerCase();

        for (const claim of ["deleted", "permanently", "banned", "cannot appeal", "final"]) {
            assert.ok(!words.includes(claim), `${reason.code} says "${claim}"`);
        }
    }
});

// Taking down something that was live is a different conversation from
// never putting it up, and reading one list for the other would tell a
// business its live offer has an end-date problem.
test("a suspension never reads from the rejection list", () => {
    assert.equal(findReason("offer", "suspended", "end-date"), null);
    assert.equal(findReason("offer", "rejected", "not-honoured"), null);
    assert.equal(findReason("business", "suspended", "thin-profile"), null);
    assert.equal(findReason("business", "rejected", "unreachable"), null);
});

test("a suspension needs a reason like everything else", () => {
    assert.ok(!declineIsComplete("offer", "suspended", "", null));
    assert.ok(!declineIsComplete("offer", "suspended", "other", "  "));
    assert.ok(declineIsComplete("offer", "suspended", "not-honoured", null));
});

test("a suspension says what puts it back, not what to change", () => {
    const reason = findReason("business", "suspended", "unreachable")!;

    assert.deepEqual(declineLines("business", "suspended", "unreachable"), [
        reason.says,
        reason.fix,
    ]);

    assert.match(reason.fix, /back up/);
});

// The one thing a suspension must never imply. A business reading that
// its page is gone cancels; a business reading that it is paused
// replies.
test("no suspension suggests anything was lost", () => {
    for (const reason of [...BUSINESS_SUSPENSIONS, ...OFFER_SUSPENSIONS]) {
        const words = `${reason.says} ${reason.fix}`.toLowerCase();

        for (const claim of ["deleted", "removed for good", "closed your account", "cancelled"]) {
            assert.ok(!words.includes(claim), `${reason.code} says "${claim}"`);
        }
    }
});
