import assert from "node:assert/strict";
import { test } from "node:test";

import { voucherConfirmationEmail } from "@/lib/account-emails";

const voucher = () =>
    voucherConfirmationEmail({
        to: "someone@example.com",
        code: "5280613F90",
        offerTitle: "Get that Friday feeling",
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
        code: "ABCDEF0123",
        offerTitle: "A free coffee",
        discount: "Free",
        businessName: "Little Loaf",
        expiresAt: null,
    });

    assert.match(html, /whenever you&#39;re next in/);
    assert.match(html, /ABCDEF0123/);
});
