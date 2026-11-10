import assert from "node:assert/strict";
import { test } from "node:test";

import { customerWelcomeDue } from "@/lib/customer-welcome";

const now = Date.parse("2026-11-10T12:00:00Z");
const justNow = new Date(now - 60_000).toISOString();

function due(over: Partial<Parameters<typeof customerWelcomeDue>[0]> = {}) {
    return customerWelcomeDue({
        next: "/dashboard",
        createdAt: justNow,
        welcomedAt: null,
        businessSignUpAt: null,
        runsABusiness: false,
        now,
        ...over,
    });
}

test("a new customer gets the welcome", () => {
    assert.equal(due(), true);
    assert.equal(due({ next: "/offers/flat-white-friday" }), true);
});

test("somebody who already runs a business never gets it", () => {
    // The bug: signed up as a business, made one, then signed in on the
    // customer form — and was told to go and find offers near them.
    assert.equal(due({ runsABusiness: true }), false);
    assert.equal(due({ businessSignUpAt: justNow }), false);
    assert.equal(due({ runsABusiness: true, next: "/offers/flat-white-friday" }), false);
});

test("the business side and team invitations send their own emails", () => {
    assert.equal(due({ next: "/business/setup/new" }), false);
    assert.equal(due({ next: "/onboarding" }), false);
    assert.equal(due({ next: "/business/preview/amsterdam-dandy-fcdbe48a" }), false);
    assert.equal(due({ next: "/invite/5f1c6d2e" }), false);
});

test("it is sent once, and only to accounts made since it existed", () => {
    assert.equal(due({ welcomedAt: justNow }), false);
    assert.equal(due({ createdAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() }), false);
    assert.equal(due({ createdAt: new Date(now - 23 * 60 * 60 * 1000).toISOString() }), true);
});
