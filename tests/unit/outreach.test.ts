import assert from "node:assert/strict";
import { test } from "node:test";

import { FOUNDING_MEMBER_LIMIT, FOUNDING_TRIAL_DAYS, TRIAL_DAYS, freeFor, plans } from "@/lib/billing";
import {
    DEFAULT_SENDER,
    followUpSubject,
    outreachDm,
    outreachFollowUp,
    outreachMessage,
    outreachSubject,
    ownNumbers,
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
    assert.equal(outreachSubject(preview), "Little Loaf, I built you a preview");
});

test("the follow-up is a reply, not a second cold email", () => {
    // Same thread, so it arrives under the first one rather than as
    // another unknown sender.
    assert.equal(followUpSubject(preview), "Re: Little Loaf, I built you a preview");
});

test("the personal line is a paragraph of its own", () => {
    // It is the one thing in the email that could not have been sent to
    // anybody else, and standing alone is how that reads as noticing
    // rather than as a mail merge.
    const body = email({ personalLine: "Your window display is the best on the road." });

    assert.match(body, /\n\nYour window display is the best on the road\.\n\nI've built a preview/);
});

test("a personal line with no full stop is given one", () => {
    const body = email({ personalLine: "  Your window display is the best on the road  " });

    assert.match(body, /\n\nYour window display is the best on the road\.\n/);

    // Punctuation it already has is left alone.
    assert.match(email({ personalLine: "Who bakes the sourdough?" }), /\n\nWho bakes the sourdough\?\n/);
});

test("without one the greeting runs straight into the preview", () => {
    const body = email({ personalLine: null });

    assert.match(body, /^Hi Sam,\n\nI've built a preview/);
    assert.doesNotMatch(body, /\n\n\n/, "no empty paragraph where the line would have been");
    assert.equal(personalOpening("   "), "", "whitespace is no line at all");
});

test("with no name it greets them anyway", () => {
    assert.match(email({ contactName: null }), /^Hi there,/);
});

test("the directory is named by its town, not by Bristol", () => {
    // Nothing in the product is Bristol-only (docs/MULTI-CITY.md), and a
    // hardcoded town is wrong the day a second one opens.
    assert.match(email(), /the Bristol directory/);

    const bath = {
        ...preview,
        businesses: { ...preview.businesses, business_locations: [{ city: "Bath", cities: { name: "Bath" } }] },
    } as typeof preview;

    assert.match(outreachMessage({ preview: bath, placesLeft: 38, contactName: "Sam" }), /the Bath directory/);
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
    assert.match(body, new RegExp(`free for ${freeFor(FOUNDING_TRIAL_DAYS)}`));
    assert.match(body, new RegExp(`${plans.pro_founding_monthly.price} a month instead of ${plans.pro_monthly.price}`));
});

test("once they are gone it offers the ordinary trial instead", () => {
    // Naming a thing nobody can have is a reason to stop reading.
    for (const placesLeft of [0, null]) {
        const body = email({ placesLeft });

        assert.doesNotMatch(body, /founding/i);
        assert.match(body, new RegExp(`free for ${freeFor(TRIAL_DAYS)}`));
    }
});

test("it promises the link is private, and offers a way out", () => {
    const body = email();

    assert.match(body, /The preview is private/);
    assert.match(body, /Not for you\? Reply and I'll delete it/);
});



// --- The follow-up ---------------------------------------------------

const followUp = (over: Partial<Parameters<typeof outreachFollowUp>[0]> = {}) =>
    outreachFollowUp({ preview, placesLeft: 38, contactName: "Sam", ...over });

test("both emails end with a sign-off, and leave the small print to the signature", () => {
    // Two different things. The sign-off ends the letter; the signature
    // is the block a business email has to carry. A letter that stops
    // dead at its last sentence and goes straight into a registered
    // office reads like a notice rather than a note.
    for (const body of [email(), followUp()]) {
        assert.match(body, /\n\nCheers,\nHarry$/, "ends on the sign-off");
        assert.doesNotMatch(body, /17546946/, "no registered office in the body");
        assert.doesNotMatch(body, /Founder/, "and no signature block");
    }
});
test("the follow-up is short, and carries the link again", () => {
    const body = followUp();

    assert.match(body, /^Hi Sam,/);
    assert.match(body, /Your preview of Little Loaf is still waiting/);
    assert.match(body, /business\/preview\//);
    assert.match(body, /Reply "no thanks" and I'll delete it/);
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

// --- The Instagram DM ------------------------------------------------

const dmArgs = { preview, sender: "Harry Northam", placesLeft: 38, contactName: "Sam" };

test("the DM opens by saying who is writing", () => {
    // A cold DM from an account nobody knows is read as a scam unless a
    // person is attached to it in the first line.
    assert.match(outreachDm(dmArgs), /^Hi Sam, I'm Harry, founder of Promotello\./);
});

test("with no contact name a DM greets the business, not 'there'", () => {
    // It is the shop's own account: "Hi there" in a DM reads like it was
    // fired at a list, where the shop's name reads like it was not.
    assert.match(outreachDm({ ...dmArgs, contactName: null }), /^Hi Little Loaf, I'm Harry/);
});

test("the opener carries no link at all", () => {
    // A cold DM with a link in it is the shape of every scam people are
    // told to ignore. It asks, and the link goes in the reply.
    const opener = outreachDm({ ...dmArgs, variant: "opener" });

    assert.ok(!opener.includes("http"), opener);
    assert.match(opener, /Want me to send the link\?$/);
    assert.ok(!opener.includes("\n"), "one paragraph, because a DM is read in a second");
});

test("the full DM carries the link and the offer", () => {
    const dm = outreachDm(dmArgs);

    assert.match(dm, /business\/preview\//);
    assert.match(dm, /A QR poster goes in your window/);
    assert.match(dm, /the Bristol directory/);
    assert.match(dm, new RegExp(`first ${FOUNDING_MEMBER_LIMIT} businesses get Pro free for ${freeFor(FOUNDING_TRIAL_DAYS)}`));
    assert.match(dm, /Not for you\? Just say and I'll delete it\./);
});

test("the full DM signs off; the opener does not", () => {
    // A sign-off under a one-line question is a letter pretending to be
    // a message. Under a message that ran to a few paragraphs it is
    // just how you end one.
    assert.match(outreachDm(dmArgs), /\n\nCheers,\nHarry$/);
    assert.doesNotMatch(outreachDm({ ...dmArgs, variant: "opener" }), /Cheers/);
});

test("the personal line reaches both DMs", () => {
    const personalLine = "Your sourdough is the best on the road";

    // In the opener it sits between two sentences, so it needs the stop.
    assert.match(
        outreachDm({ ...dmArgs, personalLine, variant: "opener" }),
        /founder of Promotello\. Your sourdough is the best on the road\. I've built/,
    );

    // In the full one it is a paragraph of its own.
    assert.match(
        outreachDm({ ...dmArgs, personalLine, variant: "full" }),
        /\n\nYour sourdough is the best on the road\.\n\n/,
    );
});

test("a DM with no sender name still says who it is from", () => {
    assert.match(outreachDm({ ...dmArgs, sender: DEFAULT_SENDER }), /^Hi Sam, I'm from Promotello\./);
});

test("the DM names the town it is actually in", () => {
    const bath = {
        ...preview,
        businesses: { ...preview.businesses, business_locations: [{ city: "Bath", cities: { name: "Bath" } }] },
    } as typeof preview;

    assert.match(outreachDm({ ...dmArgs, preview: bath }), /the Bath directory/);
    assert.match(outreachDm({ ...dmArgs, preview: bath, variant: "opener" }), /our Bath directory/);
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

test("the DM leaves the numbers line to the email", () => {
    // Short enough to read in a second is the whole point of a DM.
    const dm = outreachDm({ ...dmArgs, placesLeft: 37 });

    assert.ok(!dm.includes("take my word"));
    assert.ok(dm.length < 600, `a DM should stay short, this one is ${dm.length}`);
});

// "50 of the 50 places left" is a sentence that says nobody has taken
// one. The first email has always guarded against it; the follow-up
// names a count, so it needs the same guard.
test("the follow-up does not say nobody has joined", () => {
    const untouched = outreachFollowUp({ preview, placesLeft: FOUNDING_MEMBER_LIMIT, contactName: "Sam" });

    assert.doesNotMatch(untouched, new RegExp(`${FOUNDING_MEMBER_LIMIT} of the ${FOUNDING_MEMBER_LIMIT}`));
    assert.match(untouched, /A founding place comes with/);
    assert.match(untouched, new RegExp(`Pro free for ${freeFor(FOUNDING_TRIAL_DAYS)}`));

    // Once some have gone, the count is worth saying.
    assert.match(
        outreachFollowUp({ preview, placesLeft: 31, contactName: "Sam" }),
        new RegExp(`31 of the ${FOUNDING_MEMBER_LIMIT} founding places are left`),
    );
});
