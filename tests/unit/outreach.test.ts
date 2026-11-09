import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_SENDER, outreachDm, outreachMessage, outreachSubject, signOff } from "@/app/admin/previews/preview-shared";

const preview = {
    businesses: {
        name: "Little Loaf",
        business_locations: [{ city: "Bristol", region: "Gloucester Road", cities: { name: "Bristol" } }],
    },
    contact_name: "Sam",
    token: "11111111-2222-3333-4444-555555555555",
} as unknown as Parameters<typeof outreachMessage>[0];

test("the subject offers a page, not the thing every stamp-card app emails about", () => {
    const subject = outreachSubject(preview);

    assert.match(subject, /Little Loaf/);
    assert.doesNotMatch(subject, /loyalty card/i);
});

test("page, then offer, then card, then reminders", () => {
    const message = outreachMessage(preview, "Harry Northam", 38);

    const page = message.indexOf("page in the Bristol directory");
    const offer = message.indexOf("claim your offer");
    const card = message.indexOf("stamp card");
    const reminders = message.indexOf("follow you");

    assert.ok(page > 0, "the page they get comes first");
    assert.ok(offer > page, "then the offer that brings someone in");
    assert.ok(reminders > card, "reminders come after the card");

    assert.ok(card > offer, "the card is what brings them back, so it comes after");
    // The poster is what carries the offer into the street.
    assert.match(message, /QR poster in your window/);
});

test("the DM runs in the same order", () => {
    const dm = outreachDm(preview, "Harry Northam", 38);

    const page = dm.indexOf("page in the Bristol directory");
    const offer = dm.indexOf("claim an offer");
    const card = dm.indexOf("stamp card");

    assert.ok(page > 0 && offer > page && card > offer, dm);
});

test("the directory is something that grows, and nothing waits on it", () => {
    const message = outreachMessage(preview, "Harry Northam", 38);

    // A new directory can't promise an audience it hasn't got.
    assert.match(message, /gets better as more of Gloucester Road joins/);
    assert.match(message, /None of that has to happen first/);
    assert.doesNotMatch(message, /people browse|people search/);
    // The one thing a loyalty app can't say about its card.
    assert.match(message, /before they have ever been in/);
});

test("it says who is writing, and that this is new", () => {
    const message = outreachMessage(preview, "Harry Northam", 38);

    assert.match(message, /I'm Harry — I'm building Promotello here in Bristol/);
    assert.match(message, /It's new, and I'm starting with Gloucester Road/);

    // Said after the link: the first line is for them, not for us.
    assert.ok(message.indexOf("I'm Harry") > message.indexOf("/business/preview/"));
});

test("with no name on the account it is still honest about being new", () => {
    const message = outreachMessage(preview, DEFAULT_SENDER, 38);

    assert.match(message, /We're building Promotello here in Bristol/);
    assert.doesNotMatch(message, /I'm —/);
});

test("a business with no area named is told it is new without a street", () => {
    const withoutArea = {
        ...preview,
        businesses: {
            ...preview.businesses,
            business_locations: [{ city: "Bristol", region: null, cities: { name: "Bristol" } }],
        },
    } as unknown as Parameters<typeof outreachMessage>[0];

    const message = outreachMessage(withoutArea, "Harry Northam", 38);

    assert.match(message, /here in Bristol, and it's new\./);
    assert.doesNotMatch(message, /starting with/);
});

test("a person signs it, by their first name", () => {
    const message = outreachMessage(preview, "Harry Northam", 38);

    assert.ok(message.endsWith("Cheers,\nHarry"), message.slice(-40));
    assert.doesNotMatch(message, /Northam/);
});

test("a DM signs off on one line", () => {
    assert.ok(outreachDm(preview, "Harry Northam", 38).endsWith("— Harry"));
    // Nothing to sign when there is no person to name. The body has an em
    // dash of its own, so this is about how it ends.
    assert.ok(outreachDm(preview, DEFAULT_SENDER, 38).trimEnd().endsWith("I won't message again."));
});

test("without a name it is the team, and it says thanks rather than cheers", () => {
    assert.deepEqual(signOff(DEFAULT_SENDER), ["Thanks,", DEFAULT_SENDER]);
    assert.deepEqual(signOff("Harry Northam"), ["Cheers,", "Harry"]);
    assert.deepEqual(signOff("  Harry  "), ["Cheers,", "Harry"]);
});
