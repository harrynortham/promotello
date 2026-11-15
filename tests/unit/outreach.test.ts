import assert from "node:assert/strict";
import { test } from "node:test";

import {
    DEFAULT_SENDER,
    ownNumbers,
    outreachDm,
    outreachMessage,
    outreachSubject,
    signOff,
} from "@/app/admin/previews/preview-shared";

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

// What stands in for reviews we do not have yet: the number on their
// own dashboard, not a promise they would have to trust
// (docs/LAUNCH-FUNNEL.md).
test("it sends them to their own numbers, and promises nothing to adjudicate", () => {
    const line = ownNumbers("Harry Northam");

    assert.match(line, /take my word for any of it/);
    assert.match(line, /how many customers Promotello actually sent you/);

    // A refund has to be adjudicated, and "nobody came in through it"
    // is a judgement two people can read differently.
    assert.ok(!/refund|money back|guarantee/i.test(line));
});

// introduction() already splits these two voices; this has to as well,
// or a sentence signed "The Promotello team" says "I'll".
test("it speaks as a person or as the team, like the introduction does", () => {
    const person = ownNumbers("Harry Northam");
    const team = ownNumbers(DEFAULT_SENDER);

    assert.match(person, /take my word/);
    assert.match(person, /tell me/);

    assert.match(team, /take our word/);
    assert.match(team, /tell us/);
    assert.ok(!/take my word|\btell me\b/.test(team));
});

test("the email carries it, and the offer to finish the page for them", () => {
    const message = outreachMessage(preview, "Harry Northam", 37);

    assert.match(message, /take my word for any of it/);

    // introduction() already says the company is new; saying it again
    // three paragraphs later sounds unsure.
    assert.equal(message.match(/It's new/g)?.length, 1);
    assert.match(message, /photo of the shop and your hours and I'll finish it for you/);
});

// A DM is read on a phone in a second, so it carries the short version
// of the same two things, and no guarantee: a refund promise in a DM
// reads as a sales line rather than a commitment.
// A DM is read on a phone in a second, so it carries the short version
// of the pitch and leaves this to the email, where there is room to say
// which number and why it is theirs rather than ours.
test("the DM offers to finish it, and leaves the numbers line to the email", () => {
    const dm = outreachDm(preview, "Harry Northam", 37);

    assert.match(dm, /send me a photo of the shop and your hours/);
    assert.ok(!dm.includes("take my word"));
});
