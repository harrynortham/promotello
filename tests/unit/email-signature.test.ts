import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { SIGNATURE_HTML } from "@/lib/email-signature";
import { SOCIAL_ORDER } from "@/lib/social-links";
import { asHtml, withSignature } from "@/lib/outreach-queue";

// The file is what a person edits; the constant is what the server
// sends. Inlined because a file read from the repo is not something a
// server bundle can be relied on to carry — so this is the thing that
// notices when the two stop matching.
test("the inlined signature is the file", () => {
    const file = readFileSync("marketing/email/signature.html", "utf8").trim();

    assert.equal(SIGNATURE_HTML, file);
});

test("the registered office appears once, in each part", () => {
    // It used to be appended to the body on its own. The signature
    // carries it now, and printing both would have put the company
    // number in twice on every cold email.
    const body = withSignature("Hi Sam,\n\nHave a look at your page.");
    const html = asHtml(body);

    const count = (value: string, needle: string) => value.split(needle).length - 1;

    assert.equal(count(body, "17546946"), 1, "once in the text part");
    assert.equal(count(html, "17546946"), 1, "once in the HTML part");
});

test("the HTML carries the real signature, not the written-out one", () => {
    const html = asHtml(withSignature("Hi Sam,\n\nHave a look at your page."));

    assert.ok(html.includes(SIGNATURE_HTML), "the markup is there");
    assert.ok(html.includes("Have a look at your page"), "and so is the letter");

    // The plain-text stand-in is taken back off, or the name would be
    // printed above the picture of itself.
    assert.ok(!html.includes("Promotello — Local offers, real customers"), "no text sign-off left in");
});

test("the letter is still the letter", () => {
    const body = withSignature("Hi Sam,\n\nHave a look.");

    assert.ok(body.startsWith("Hi Sam,"), "it opens with the letter");
    assert.ok(body.includes("Harry Northam"), "and ends signed");
});

// The signature's icons are hand-written HTML rather than a loop over a
// list, so nothing else would notice them drifting out of the order the
// footers use. LinkedIn is not on it, which is allowed — what is there
// has to be in order, not all of it present.
test("the signature's icons are in the house order", () => {
    const found = [...SIGNATURE_HTML.matchAll(/https:\/\/www\.([a-z]+)\.com/g)]
        .map((match) => match[1])
        .filter((host) => SOCIAL_ORDER.includes(host as (typeof SOCIAL_ORDER)[number]));

    assert.deepEqual(found, SOCIAL_ORDER.filter((key) => found.includes(key)));
    assert.ok(found.length >= 4, `only found ${found.join(", ")}`);
});
