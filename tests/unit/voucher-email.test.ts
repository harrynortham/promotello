import assert from "node:assert/strict";
import { test } from "node:test";

import { voucherConfirmationEmail } from "@/lib/account-emails";
import { automationEmail } from "@/lib/automations";

const voucher = () =>
    voucherConfirmationEmail({
        to: "someone@example.com",
        redemptionId: "964afc4c-4470-4abe-83be-669f023fe75e",
        code: "5280613F90",
        offerTitle: "Get that Friday feeling",
        description: "Two pints of any draught lager or ale, for the price of one.",
        terms: "One per customer. Friday from 5pm.",
        discount: "2 for 1 on pints",
        businessName: "Dublin Pub",
        expiresAt: "2026-12-24",
    });

test("the email carries the voucher, not directions to it", () => {
    const { html } = voucher();

    // The same card the offer page shows once it's claimed.
    assert.match(html, /Your claimed voucher/);
    assert.match(html, /background:#17233B/);
    assert.match(html, /5280613F90/);
    assert.match(html, /Show this to staff when you pay/);

    // The QR as a picture: no email client runs JavaScript, and the big
    // ones don't show SVG either.
    assert.match(html, /<img src="https:\/\/[^"]+\/redeem\/5280613F90\/qr"/);
    assert.match(html, /alt="QR code for your voucher"/);

    // It used to send people somewhere else to find their own voucher.
    assert.doesNotMatch(html, /Show the QR code in My vouchers/);

    // And the button opens this voucher rather than the pile of them.
    assert.match(html, /Open this voucher/);
    assert.match(html, /\/dashboard\/redemptions\/964afc4c-4470-4abe-83be-669f023fe75e/);
    assert.doesNotMatch(html, /\/dashboard\/redemptions"/);
});

// A voucher on its own is a code. What it covers, and what it says, are
// the two things somebody checks before they go.
test("the email says what the offer covers and what it says", () => {
    const { html, text } = voucher();

    assert.match(html, /What you get/);
    assert.match(html, /Two pints of any draught lager or ale/);
    assert.match(html, /Terms/);
    assert.match(html, /One per customer\. Friday from 5pm\./);

    assert.match(text, /What you get: Two pints/);
    assert.match(text, /Terms: One per customer/);
});

test("an offer with neither gets neither", () => {
    const { html } = voucherConfirmationEmail({
        to: "someone@example.com",
        redemptionId: "964afc4c-4470-4abe-83be-669f023fe75e",
        code: "5280613F90",
        offerTitle: "Get that Friday feeling",
        description: "   ",
        terms: null,
        discount: "2 for 1 on pints",
        businessName: "Dublin Pub",
        expiresAt: null,
    });

    assert.doesNotMatch(html, /What you get/);
    assert.doesNotMatch(html, />Terms</);
});

test("the code reads without pictures, and without HTML", () => {
    const { text, html } = voucher();

    assert.match(text, /Your redemption code: 5280613F90/);
    assert.match(text, /scan it or type the code/);
    assert.match(text, /Use it by 24 December 2026/);
    assert.match(html, /Use it by 24 December 2026/);
});

test("an offer with no end date still says something", () => {
    const { html } = voucherConfirmationEmail({
        to: "someone@example.com",
        redemptionId: "11111111-2222-4333-8444-555555555555",
        code: "ABCDEF0123",
        offerTitle: "A free coffee",
        discount: "Free",
        businessName: "Little Loaf",
        expiresAt: null,
    });

    assert.match(html, /whenever you&#39;re next in/);
    assert.match(html, /ABCDEF0123/);
});

// The other voucher: one an automation gives a follower, which is held up
// at the same till and so carries the same card.
test("a reward voucher arrives in the same card", () => {
    const { html, text, subject, senderName } = automationEmail({
        voucher_id: "00000000-0000-4000-8000-000000000000",
        kind: "welcome",
        reward: "10% off your first visit",
        code: "G1A2B3C4D5",
        expires_at: "2026-11-24T00:00:00Z",
        business_id: "00000000-0000-4000-8000-000000000000",
        business_name: "Dublin Pub",
        email: "someone@example.com",
        first_name: "Harry",
        unsubscribe_token: "00000000-0000-4000-8000-000000000001",
    });

    assert.equal(subject, "Thanks for following Dublin Pub");
    // Sent on the business's behalf, so it reads as theirs.
    assert.equal(senderName, "Dublin Pub");

    assert.match(html, /Your claimed voucher/);
    assert.match(html, /<img src="https:\/\/[^"]+\/redeem\/G1A2B3C4D5\/qr"/);
    assert.match(html, /G1A2B3C4D5/);
    assert.match(html, /Use it by 24 November/);

    assert.match(html, /Open this voucher/);
    assert.match(html, /\/dashboard\/redemptions\/00000000-0000-4000-8000-000000000000/);

    // It used to spell the code out mid-sentence and send them elsewhere
    // for the picture.
    assert.doesNotMatch(html, /Show code G1A2B3C4D5 at the till/);
    assert.match(text, /Your redemption code: G1A2B3C4D5/);
});
