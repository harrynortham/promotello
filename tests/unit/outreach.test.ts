import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_SENDER, outreachDm, outreachMessage, outreachSubject, signOff } from "@/app/admin/previews/preview-shared";

const preview = {
    businesses: {
        name: "Little Loaf",
        business_locations: [{ city: "Bristol", cities: { name: "Bristol" } }],
    },
    contact_name: "Sam",
    token: "11111111-2222-3333-4444-555555555555",
} as unknown as Parameters<typeof outreachMessage>[0];

test("the subject offers a page, not the thing every stamp-card app emails about", () => {
    const subject = outreachSubject(preview);

    assert.match(subject, /Little Loaf/);
    assert.doesNotMatch(subject, /loyalty card/i);
});

test("the directory comes before the card", () => {
    const message = outreachMessage(preview, "Harry Northam", 38);

    const directory = message.indexOf("directory");
    const card = message.indexOf("stamp card");

    assert.ok(directory > 0, "the message names the directory");
    assert.ok(card > directory, "the card is the second half of the argument, not the first");
    // The one thing a loyalty app can't say about its card.
    assert.match(message, /before they have ever been in/);
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
