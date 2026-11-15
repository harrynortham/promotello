import assert from "node:assert/strict";
import { test } from "node:test";

import { monthStrength, monthlyReportEmail } from "@/lib/monthly-report";

// A business pays for this one, so it reports whatever happened. What it
// must not do is send a grid of noughts under "Here's how October went",
// which is a monthly reminder that nothing is working, from the company
// being paid for it.

const report = (metrics: Record<string, { current: number; previous: number }>, followers = 0) => ({
    business_id: "11111111-2222-3333-4444-555555555555",
    business_name: "Quayside Coffee",
    emails: ["sam@example.com"],
    figures: { followers, metrics },
});

const some = (current: number, previous = 0) => ({ current, previous });

test("a month is judged by what somebody did, not by what loaded", () => {
    assert.equal(monthStrength(report({ visits: some(61) })), "visits");
    assert.equal(monthStrength(report({ claims: some(4) })), "interest");
    assert.equal(monthStrength(report({ new_followers: some(2) })), "interest");
    assert.equal(monthStrength(report({}, 12)), "interest");
    assert.equal(monthStrength(report({ views: some(600), qr_scans: some(40) })), "looking");
    assert.equal(monthStrength(report({ views: some(0) })), "nothing");
});

test("a month with visits reads as it always did", () => {
    const email = monthlyReportEmail(report({ visits: some(61, 44), claims: some(23) }, 38), "sam@example.com", "October");

    assert.match(email.subject, /Your October on Promotello/);
    assert.match(email.text, /61 customer visits came through Promotello in October/);
    // The table is the thing they pay for.
    assert.match(email.text, /Vouchers claimed: 23/);
});

test("claims without a visit say so, rather than reading as a good month", () => {
    const email = monthlyReportEmail(report({ claims: some(4), views: some(300) }, 9), "sam@example.com", "October");

    assert.match(email.text, /4 vouchers were claimed in October, and nobody has come in with one yet/);
    // And it says what to do about it.
    assert.match(email.text, /end date on it/);
});

test("a month where people only looked says that, in their own numbers", () => {
    const email = monthlyReportEmail(report({ views: some(540), qr_scans: some(72) }), "sam@example.com", "October");

    assert.match(email.text, /612 people looked at Quayside Coffee in October/);
    assert.doesNotMatch(email.text, /Here's how October went/);
});

// The one that started this.
test("a month of nothing gets a sentence, not a grid of noughts", () => {
    const email = monthlyReportEmail(
        report({ visits: some(0), claims: some(0), views: some(0), qr_scans: some(0) }),
        "sam@example.com",
        "October",
    );

    assert.match(email.text, /Nothing came through Promotello in October/);
    // No table at all, in either half of the email.
    assert.doesNotMatch(email.text, /Vouchers claimed: 0/);
    assert.doesNotMatch(email.html, /Views of your page and offers/);
    // And one thing to do instead.
    assert.match(email.text, /A live offer with an end date/);
});

// The report is the proof, and the business that most needs it is the
// one deciding whether to pay — so it now goes to everyone, and what
// Growth buys is the detail (docs/LAUNCH-FUNNEL.md).
test("a short report leads with the same headline and drops the table", () => {
    const month = {
        business_id: "b-1",
        business_name: "Little Loaf",
        emails: ["sam@example.com"],
        figures: {
            full_report: false,
            followers: 12,
            metrics: {
                visits: { current: 9, previous: 4 },
                claims: { current: 14, previous: 6 },
                views: { current: 80, previous: 40 },
            },
        },
    };

    const short = monthlyReportEmail(month, "sam@example.com", "October");

    assert.match(short.text, /9 customer visits came through Promotello in October/);
    assert.ok(!short.text.includes("Views of your page and offers"), "no table of seven");
    assert.match(short.text, /Followers: 12/);
    assert.match(short.html, /Growth puts the whole month in this email/);

    // The same month on Growth: the headline, and every number with
    // last month beside it.
    const full = monthlyReportEmail(
        { ...month, figures: { ...month.figures, full_report: true } },
        "sam@example.com",
        "October",
    );

    assert.match(full.text, /9 customer visits came through Promotello in October/);
    assert.match(full.text, /Views of your page and offers: 80/);
    assert.ok(!full.html.includes("Growth puts the whole month in this email"));
});

// Written before the flag existed, when only Growth got one at all.
test("a payload with no flag is the full report", () => {
    const email = monthlyReportEmail(
        {
            business_id: "b-1",
            business_name: "Little Loaf",
            emails: [],
            figures: { followers: 3, metrics: { visits: { current: 2, previous: 1 } } },
        },
        "sam@example.com",
        "October",
    );

    assert.match(email.text, /Customer visits \(vouchers used and loyalty stamps\): 2/);
});

// A month of nothing is a sentence and a nudge on either plan: a grid
// of noughts is a monthly reminder that nothing is working.
test("a month of nothing reads the same on both", () => {
    for (const full_report of [true, false]) {
        const email = monthlyReportEmail(
            {
                business_id: "b-1",
                business_name: "Little Loaf",
                emails: [],
                figures: { full_report, followers: 0, metrics: {} },
            },
            "sam@example.com",
            "October",
        );

        assert.match(email.text, /Nothing came through Promotello in October/);
        assert.ok(!email.text.includes("Views of your page and offers"));
    }
});
