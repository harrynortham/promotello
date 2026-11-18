import assert from "node:assert/strict";
import { test } from "node:test";

import { FOUNDING_MEMBER_LIMIT, FOUNDING_TRIAL_DAYS, TRIAL_DAYS, plans } from "@/lib/billing";
import {
    DEFAULT_SENDER,
    followUpSubject,
    ownNumbers,
    outreachDm,
    outreachFollowUp,
    outreachMessage,
    outreachSubject,
    personalOpening,
    signOff,
} from "@/lib/preview-email";

const preview = {
    businesses: {
        name: "Little Loaf",
        categories: { name: "Bakeries" },
        business_locations: [{ city: "Bristol", region: "Gloucester Road", cities: { name: "Bristol" } }],
    },
    token: "11111111-2222-3333-4444-555555555555",
} as unknown as Parameters<typeof outreachMessage>[0]["preview"];

const email = (over: Partial<Parameters<typeof outreachMessage>[0]> = {}) =>
    outreachMessage({ preview, placesLeft: 38, contactName: "Sam", ...over });

// --- The first email ------------------------------------------------

test("the subject names the preview and the business", () => {
    assert.equal(outreachSubject(preview), "A preview of Little Loaf on Promotello");
});

test("the follow-up is a reply, not a second cold email", () => {
    // Same thread, so it arrives under the first one rather than as
    // another unknown sender.
    assert.equal(followUpSubject(preview), "Re: A preview of Little Loaf on Promotello");
});

test("the personal line opens the paragraph", () => {
    const body = email({ personalLine: "Your window display is the best on the road." });

    assert.match(body, /Your window display is the best on the road\. I've put together/);
});

test("a personal line with no full stop is given one", () => {
    // It runs straight into the next sentence, and "…on the road I've
    // put together" is worse than no personal line at all.
    const body = email({ personalLine: "  Your window display is the best on the road  " });

    assert.match(body, /the best on the road\. I've put together/);

    // Punctuation it already has is left alone.
    assert.match(
        email({ personalLine: "Who bakes the sourdough?" }),
        /sourdough\? I've put together/,
    );
});

test("without one the paragraph starts clean", () => {
    const body = email({ personalLine: null });

    assert.match(body, /\n\nI've put together a preview/);
    assert.doesNotMatch(body, / {2}/, "no double space where the line would have been");
    assert.equal(personalOpening("   "), "", "whitespace is no line at all");
});

test("with no name it greets them anyway", () => {
    assert.match(email({ contactName: null }), /^Hi there,/);
});

test("the street is theirs, and the town stands in when there is none", () => {
    assert.match(email(), /helps Gloucester Road's independents/);

    const noStreet = {
        ...preview,
        businesses: { ...preview.businesses, business_locations: [{ city: "Bristol", cities: { name: "Bristol" } }] },
    } as typeof preview;

    assert.match(outreachMessage({ preview: noStreet, placesLeft: 38, contactName: "Sam" }), /helps Bristol's independents/);
});

test("it says offers and loyalty card, in those words", () => {
    const body = email();

    assert.match(body, /loyalty card/);
    assert.doesNotMatch(body, /stamp card/i, "never a stamp card");
    assert.doesNotMatch(body, /phone offers/i, "never phone offers");
});

test("the founding places are named while there are some", () => {
    const body = email({ placesLeft: 38 });

    assert.match(body, new RegExp(`first ${FOUNDING_MEMBER_LIMIT} businesses`));
    assert.match(body, new RegExp(`free for ${FOUNDING_TRIAL_DAYS} days`));
    assert.match(body, new RegExp(`${plans.pro_founding_monthly.price} a month instead of ${plans.pro_monthly.price}`));
});

test("once they are gone it offers the ordinary trial instead", () => {
    // Naming a thing nobody can have is a reason to stop reading.
    for (const placesLeft of [0, null]) {
        const body = email({ placesLeft });

        assert.doesNotMatch(body, /founding/i);
        assert.match(body, new RegExp(`free for ${TRIAL_DAYS} days`));
    }
});

test("it promises the link is private, and offers a way out", () => {
    const body = email();

    assert.match(body, /private to this link/);
    assert.match(body, /just reply and I'll delete it/);
});

test("it stops before the sign-off, because the signature is the sign-off", () => {
    const body = email();

    assert.doesNotMatch(body, /Harry/, "no name in the body");
    assert.doesNotMatch(body, /17546946/, "and no registered office");
});

// --- The follow-up ---------------------------------------------------

const followUp = (over: Partial<Parameters<typeof outreachFollowUp>[0]> = {}) =>
    outreachFollowUp({ preview, placesLeft: 38, contactName: "Sam", ...over });

test("the follow-up is short, and carries the link again", () => {
    const body = followUp();

    assert.match(body, /^Hi Sam,/);
    assert.match(body, /Just checking you saw the preview I made for Little Loaf/);
    assert.match(body, /business\/preview\//);
    assert.match(body, /reply "no thanks"/);
});

test("the follow-up drops its founding sentence the same way", () => {
    assert.match(followUp({ placesLeft: 12 }), new RegExp(`12 of the ${FOUNDING_MEMBER_LIMIT} founding places`));
    assert.doesNotMatch(followUp({ placesLeft: 0 }), /founding/i);
    assert.doesNotMatch(followUp({ placesLeft: null }), /founding/i);
});

// --- Both ------------------------------------------------------------

test("neither carries an unfilled placeholder or a double space", () => {
    for (const body of [email(), email({ personalLine: "A true sentence." }), followUp(), followUp({ placesLeft: 0 })]) {
        assert.doesNotMatch(body, /\{\{|\{[a-z ]+\}/, "nothing left to fill in");
        assert.doesNotMatch(body, /[^\n] {2}/, "no double spaces");
        assert.doesNotMatch(body, /undefined|null|NaN/, "nothing leaked from a missing value");
    }
});

// --- The Instagram DM, which is unchanged ----------------------------

test("the DM runs in the same order", () => {
    const dm = outreachDm(preview, "Harry Northam", 38, "Sam");

    const page = dm.indexOf("page in the Bristol directory");
    const offer = dm.indexOf("claim an offer");
    const card = dm.indexOf("stamp card");

    assert.ok(page > 0 && offer > page && card > offer, dm);
});

test("a DM signs off on one line", () => {
    assert.ok(outreachDm(preview, "Harry Northam", 38, "Sam").endsWith("— Harry"));
    // Nothing to sign when there is no person to name. The body has an em
    // dash of its own, so this is about how it ends.
    assert.ok(outreachDm(preview, DEFAULT_SENDER, 38, "Sam").trimEnd().endsWith("I won't message again."));
});

test("without a name it is the team, and it says thanks rather than cheers", () => {
    assert.deepEqual(signOff(DEFAULT_SENDER), ["Thanks,", DEFAULT_SENDER]);
    assert.deepEqual(signOff("Harry Northam"), ["Cheers,", "Harry"]);
    assert.deepEqual(signOff("  Harry  "), ["Cheers,", "Harry"]);
});

test("it sends them to their own numbers, and promises nothing to adjudicate", () => {
    const line = ownNumbers("Harry Northam");

    assert.match(line, /take my word for any of it/);
    assert.match(line, /how many customers Promotello actually sent you/);

    // A refund has to be adjudicated, and "nobody came in through it"
    // is a judgement two people can read differently.
    assert.ok(!/refund|money back|guarantee/i.test(line));
});

test("it speaks as a person or as the team, like the introduction does", () => {
    const person = ownNumbers("Harry Northam");
    const team = ownNumbers(DEFAULT_SENDER);

    assert.match(person, /take my word/);
    assert.match(person, /tell me/);

    assert.match(team, /take our word/);
    assert.match(team, /tell us/);
    assert.ok(!/take my word|\btell me\b/.test(team));
});

test("the DM offers to finish it, and leaves the numbers line to the email", () => {
    const dm = outreachDm(preview, "Harry Northam", 37, "Sam");

    assert.match(dm, /logo/);
    assert.match(dm, /photo of the place/);
    assert.match(dm, /I'll do the rest/);
    assert.ok(!/two minutes/.test(dm));
    assert.ok(!dm.includes("take my word"));
});

// "50 of the 50 places left" is a sentence that says nobody has taken
// one. The first email has always guarded against it; the follow-up
// names a count, so it needs the same guard.
test("the follow-up does not say nobody has joined", () => {
    const untouched = outreachFollowUp({ preview, placesLeft: FOUNDING_MEMBER_LIMIT, contactName: "Sam" });

    assert.doesNotMatch(untouched, new RegExp(`${FOUNDING_MEMBER_LIMIT} of the ${FOUNDING_MEMBER_LIMIT}`));
    assert.match(untouched, /A founding place comes with/);
    assert.match(untouched, new RegExp(`${FOUNDING_TRIAL_DAYS} days of Pro free`));

    // Once some have gone, the count is worth saying.
    assert.match(
        outreachFollowUp({ preview, placesLeft: 31, contactName: "Sam" }),
        new RegExp(`31 of the ${FOUNDING_MEMBER_LIMIT} founding places left`),
    );
});
