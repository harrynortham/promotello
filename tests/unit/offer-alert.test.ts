import assert from "node:assert/strict";
import { test } from "node:test";

import { newOfferAlertEmail } from "@/lib/business-review-emails";

const offer = {
    title: "Free coffee with any loaf",
    discount: "Free coffee",
    business: "Little Loaf Bakery",
    businessApproved: true,
};

test("the alert names the business and the offer in its subject", () => {
    const email = newOfferAlertEmail(offer, "sam@littleloaf.co.uk");

    assert.match(email.subject, /Little Loaf Bakery/);
    assert.match(email.subject, /Free coffee with any loaf/);
    assert.match(email.text, /sam@littleloaf\.co\.uk/);
    assert.match(email.html, /\/admin\/offers/);
});

test("an offer from a business that isn't approved says to start there", () => {
    const email = newOfferAlertEmail({ ...offer, businessApproved: false }, "sam@littleloaf.co.uk");

    assert.match(email.text, /still waiting for approval/);
    // The useful link is the business, not the offer queue: approving the
    // offer first is refused.
    assert.match(email.html, /\/admin\/businesses/);
    assert.doesNotMatch(email.html, /\/admin\/offers/);
});
