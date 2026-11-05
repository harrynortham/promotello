import assert from "node:assert/strict";
import { test } from "node:test";

import { CONSENT_VERSION, analyticsCookieNames, consentCookieValue, parseConsent } from "@/lib/consent";

test("a stored choice carries the day and the policy it answered", () => {
    const record = parseConsent(`analytics|2026-11-05|${CONSENT_VERSION}`);

    assert.deepEqual(record, { choice: "analytics", decidedOn: "2026-11-05", version: CONSENT_VERSION });
    assert.equal(parseConsent(`essential|2026-11-05|${CONSENT_VERSION}`)?.choice, "essential");
});

test("a choice made before we recorded the date still stands", () => {
    // The cookie as it was written before this; asking again would be
    // nagging someone who already answered this same question.
    assert.deepEqual(parseConsent("analytics"), {
        choice: "analytics",
        decidedOn: null,
        version: CONSENT_VERSION,
    });
});

test("a choice about an older policy is no choice at all", () => {
    assert.equal(parseConsent(`analytics|2026-01-01|${CONSENT_VERSION - 1}`), null);
    assert.equal(parseConsent("analytics|2026-01-01|banana"), null);
    assert.equal(parseConsent("analytics|2026-01-01|"), null);
});

test("nothing else counts as consent", () => {
    for (const value of [undefined, "", "yes", "true", "1", "allow|2026-11-05|1", "|2026-11-05|1"]) {
        assert.equal(parseConsent(value), null, `value: ${String(value)}`);
    }
});

test("the analytics cookie names follow the property we report to", () => {
    const [visitor, session] = analyticsCookieNames;

    assert.equal(visitor, "_ga");
    // GA4 names the session cookie after the stream, so this is the one
    // that goes stale when the property changes.
    assert.match(session, /^_ga_[A-Z0-9]+$/);
});

test("what we write is what we read back", () => {
    const on = new Date("2026-11-05T09:30:00.000Z");

    assert.equal(consentCookieValue("analytics", on), `analytics|2026-11-05|${CONSENT_VERSION}`);
    assert.deepEqual(parseConsent(consentCookieValue("essential", on)), {
        choice: "essential",
        decidedOn: "2026-11-05",
        version: CONSENT_VERSION,
    });
});
