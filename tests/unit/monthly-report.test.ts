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
