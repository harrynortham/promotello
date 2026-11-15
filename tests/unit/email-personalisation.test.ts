import assert from "node:assert/strict";
import { test } from "node:test";

import { brandedEmail, emailBusinessRow, emailSafeImage } from "@/lib/email";
import { firstNameOf, greeting } from "@/lib/recipients";

// Their logo and their name on the emails we send them, so an email
// about their business looks like their business.

// Set here rather than read from the environment: storedImage() checks
// against it at call time, so a test that borrows whatever the shell
// happens to have passes or fails for reasons that aren't the code's.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const host = "https://example.supabase.co";
const stored = (file: string) => `${host}/storage/v1/object/public/business-logos/${file}`;

test("a greeting is a thing an email has sometimes, not a field it fills", () => {
    assert.equal(greeting("Sam Patel"), "Hi Sam. ");
    assert.equal(firstNameOf("Sam Patel"), "Sam");

    // Nobody is made to give a name, and the alternative to a real one
    // is nothing — never "Hi ," and never a stand-in.
    for (const nothing of [null, undefined, "", "   "]) {
        assert.equal(greeting(nothing), "");
        assert.equal(firstNameOf(nothing), null);
    }
});

test("only our own public files are drawn", () => {
    assert.equal(emailSafeImage(stored("logo.png")), stored("logo.png"));

    // Somebody else's host, a private path, or not a URL at all.
    assert.equal(emailSafeImage("https://evil.example.com/logo.png"), null);
    assert.equal(emailSafeImage(`${host}/storage/v1/object/sign/x/logo.png`), null);
    assert.equal(emailSafeImage("logos/e2e.png"), null);
    assert.equal(emailSafeImage(null), null);
});

// Outlook on Windows renders mail through Word, which has never
// supported WebP, so one of these arrives as a red cross.
test("a format Outlook can't draw is not drawn", () => {
    assert.equal(emailSafeImage(stored("logo.webp")), null);
    assert.equal(emailSafeImage(stored("LOGO.WEBP")), null);
});

test("no logo means initials, not a hole", () => {
    const row = emailBusinessRow({ name: "The Cosy Corner", logoUrl: null });

    assert.match(row, /TC/);
    assert.ok(!row.includes("<img"));
    assert.match(row, /The Cosy Corner/);
});

// Images are blocked by default in a lot of clients, so the name is
// live text beside the picture rather than inside it.
test("the name is text, so a blocked image still reads as their email", () => {
    const row = emailBusinessRow({ name: "The Cosy Corner", logoUrl: stored("logo.png") });

    assert.match(row, /<img/);
    assert.match(row, />The Cosy Corner</);
    assert.match(row, /alt=""/, "decorative: the name beside it is the information");
});

test("a business row is drawn above the eyebrow, and left out when there is none", () => {
    const withIt = brandedEmail({
        business: { name: "The Cosy Corner", logoUrl: null },
        eyebrow: "Offer approved",
        title: "It's live",
        paragraphs: ["Something."],
        footer: "x",
    });

    assert.ok(withIt.html.indexOf("The Cosy Corner") < withIt.html.indexOf("Offer approved"));

    const without = brandedEmail({ eyebrow: "Offer approved", title: "It's live", paragraphs: ["Something."], footer: "x" });

    assert.ok(!without.html.includes("The Cosy Corner"));
});

test("a picture is drawn under the words, and never carries meaning alone", () => {
    const email = brandedEmail({
        eyebrow: "Offer approved",
        title: "It's live",
        paragraphs: ["Two for one on pizzas is live."],
        picture: { url: `${host}/storage/v1/object/public/offer-images/shot.jpg`, alt: "Two for one on pizzas" },
        footer: "x",
    });

    assert.match(email.html, /alt="Two for one on pizzas"/);

    // The text version is the test of that: it reads the same without.
    assert.ok(!email.text.includes("shot.jpg"));
    assert.match(email.text, /Two for one on pizzas is live/);
});
