import { FOUNDING_MEMBER_LIMIT, FOUNDING_TRIAL_DAYS, TRIAL_DAYS, freeFor, plans } from "@/lib/billing";
import { neighboursLine, type Neighbours } from "@/lib/neighbours";
import { absoluteUrl } from "@/lib/site";
import { businessPath } from "@/lib/slugs";
import { SIGNED_BY } from "@/lib/email-signature";
import { bioClaimLink, previewLink } from "@/lib/previews";

// What a preview looks like wherever it is listed or opened.
// Who to write to, the email and the Instagram handle all used to be
// here as well. They are on the lead now, which is the one record of a
// business we might write to, and keeping a second copy only meant the
// two could disagree. The name is passed in (20270209090000).
export type PreviewRow = {
    business_id: string;
    token: string;
    created_at: string;
    view_count: number;
    last_viewed_at: string | null;
    claimed_at: string | null;
    businesses: {
        name: string;
        slug: string;
        // Set once the page is public (20270307090000). What the whole
        // email hangs on now.
        listed_at: string | null;
        approval_status: string;
        review_requested_at: string | null;
        closed_at: string | null;
        logo_url: string | null;
        cover_image_url: string | null;
        // Their address. Every business has one from a trigger, and the
        // old ones are kept, so the current is the one to write to.
        business_handles?: { handle: string; is_current: boolean }[] | null;
        // The section of the directory they would be listed in. Named in
        // the email because "a page in the Bristol directory" is a place
        // in general and "listed under Bakeries" is their place.
        categories: { name: string } | null;
        business_locations: {
            city: string | null;
            region: string | null;
            area_id: string | null;
            cities: { name: string } | null;
            areas: { name: string } | null;
        }[];
    } | null;
};

export const previewColumns =
    "business_id, token, created_at, view_count, last_viewed_at, claimed_at, businesses ( name, slug, listed_at, approval_status, review_requested_at, closed_at, logo_url, cover_image_url, business_handles ( handle, is_current ), categories ( name ), business_locations ( city, region, area_id, cities ( name ), areas ( name ) ) )";

// Whether the page has been built at its own address yet.
//
// It is built but unlisted: real, at the URL it will keep for good,
// and in no listing, no search and no index until they claim it
// (lib/indexing.ts). That is a better thing to write to somebody about
// than a preview was, because it is a fact they can check in one click
// -- but it is emphatically not "your page is live", and this email
// must never say so. Nobody can find it. That is the offer.
//
// Both versions stay, because a lead whose page has not been built is
// still a preview and telling them otherwise would be a lie in the one
// email that cannot afford one. Every piece of outreach below asks this
// first.
function isBuilt(preview: PreviewRow) {
    return Boolean(preview.businesses?.listed_at);
}

// Their page at the address it will keep. The claim link is a different
// thing and does a different job: this one is the proof, that one is
// the way in.
function builtPage(preview: PreviewRow) {
    const slug = preview.businesses?.slug;
    return slug ? absoluteUrl(businessPath({ slug })) : null;
}

// Signed by a real name where there is one. A DM from a brand account
// signed "The Promotello team" reads worse than one signed by nobody.
export const DEFAULT_SENDER = "The Promotello team";

export function senderName(fullName: unknown) {
    return typeof fullName === "string" && fullName.trim() ? fullName.trim() : DEFAULT_SENDER;
}

// A cold email signed with a full name reads like a letter from a company.
// Signed with a first name it reads like a person who has done something for
// you, which is what has actually happened.
// Who is writing, and the fact they will find out for themselves the moment
// they open the page: that this is new and small. Said plainly it makes the
// founding price make sense and the rest believable. Not apologised for —
// "we're just starting out, bear with us" is a plea, and nobody buys from
// one.
export function introduction(sender: string, town: string, street: string | null) {
    const who =
        sender === DEFAULT_SENDER
            ? `We're building Promotello here in ${town}`
            : `I'm ${sender.trim().split(/\s+/)[0]} — I'm building Promotello here in ${town}`;

    return street ? `${who}. It's new, and I'm starting with ${street}.` : `${who}, and it's new.`;
}

// What stands in for reviews we do not have yet.
//
// A cold email from an unknown company asks a business to believe two
// things: that this works, and that we will still be here. There are no
// testimonials to settle it and inventing them is out
// (docs/LAUNCH-FUNNEL.md).
//
// So it points at the one number they can check themselves rather than
// at a promise they would have to trust. Their analytics page says how
// many first-time customers Promotello sent them — people who claimed
// an offer or joined the card at least an hour before their first
// visit, so somebody joining at the counter is not counted — and since
// 20270112090000 it says it on every plan, which is what makes this
// sentence true rather than a nice line.
//
// Deliberately not a refund promise. A refund has to be adjudicated,
// and "nobody came in through it" is a judgement two people can read
// differently; this is a number we would both be looking at.
export function ownNumbers(sender: string) {
    const team = sender === DEFAULT_SENDER;

    // Not "it's new, so…". The email does not say that anywhere else,
    // and leading with it here would turn the one checkable promise in
    // the letter into an apology for needing to make it.
    return `You don't have to take ${team ? "our" : "my"} word for any of it: your dashboard shows how many customers Promotello actually sent you, and if that's zero after a month, tell ${team ? "us" : "me"} and we'll sort it out.`;
}

export function signOff(sender: string) {
    if (sender === DEFAULT_SENDER) {
        return ["Thanks,", DEFAULT_SENDER];
    }

    return ["Cheers,", sender.trim().split(/\s+/)[0]];
}

// What became of a preview somebody claimed. Outreach is done with it;
// what matters now is whether it turned into a business, and whose move
// it is if it hasn't.
export type ClaimedState = {
    label: string;
    // Waiting on them, waiting on us, or finished either way.
    tone: "live" | "them" | "us" | "gone";
};

export function claimedState(preview: PreviewRow): ClaimedState {
    const business = preview.businesses;

    if (!business || business.closed_at) {
        return { label: "Closed", tone: "gone" };
    }

    if (business.approval_status === "approved") {
        return { label: "Live", tone: "live" };
    }

    if (business.approval_status === "rejected" || business.approval_status === "suspended") {
        return { label: business.approval_status === "rejected" ? "Not approved" : "Suspended", tone: "gone" };
    }

    // Pending: ours to review once they've sent it, theirs until then.
    return business.review_requested_at
        ? { label: "Waiting for review", tone: "us" }
        : { label: "Not sent", tone: "them" };
}

// Claimed, but the owner hasn't sent the page to us — so it is invisible
// to customers and waiting on them, not on us. Worth seeing at a glance:
// a page nobody sends is a business quietly lost.
export function awaitingSend(preview: PreviewRow) {
    return claimedState(preview).tone === "them";
}

export const statusLabels: Record<string, string> = {
    to_send: "Not emailed",
    sent: "Emailed",
    replied: "Replied",
    not_interested: "Not interested",
};

// What to offer next, given where it is.
export const nextStatuses: Record<string, { value: string; label: string }[]> = {
    to_send: [{ value: "sent", label: "Mark emailed" }],
    sent: [
        { value: "replied", label: "Replied" },
        { value: "not_interested", label: "Not interested" },
        { value: "to_send", label: "Not emailed after all" },
    ],
    replied: [{ value: "not_interested", label: "Not interested" }],
    not_interested: [{ value: "sent", label: "Back to emailed" }],
};

export function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(
        new Date(value),
    );
}

// Accepts whatever is to hand: a bare handle, an @handle, or a profile URL
// copied out of the address bar. Returns the bare lowercase handle the column
// stores, or null if it could not be read as one.
export function instagramHandle(raw: string | null | undefined) {
    if (!raw) return null;

    let value = raw.trim();

    // A pasted profile link is the commonest way this arrives.
    const fromUrl = value.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i);
    if (fromUrl) value = fromUrl[1];

    value = value.replace(/^@+/, "").trim();

    return /^[a-zA-Z0-9._]{1,30}$/.test(value) ? value.toLowerCase() : null;
}

// Instagram's own message link: opens the thread in the app on a phone, and
// the web inbox on a desktop.
export function instagramDmUrl(handle: string) {
    return `https://ig.me/m/${handle}`;
}

// The subject line. It leads with something that already exists and with
// their own business, because a cold email is read or deleted on this line
// alone.
//
// Not "your loyalty card is waiting": that is the line every stamp-card app
// sends, and it invites the comparison we lose. A page is the thing they
// don't already have an email about.
//
// Waiting, not ready: ready is a thing that has been finished and is now
// sitting there, which is a notification. Waiting is a thing that wants
// them, which is why they open it.
export function outreachSubject(preview: PreviewRow) {
    const name = preview.businesses?.name ?? "Your business";

    // "I built you a preview" is an offer; "I built you a page" is a
    // thing that has happened, and a thing that has happened to their
    // own business is the only sort of line worth opening in an inbox
    // from a company they have never heard of.
    return isBuilt(preview) ? `${name}, I built you a page` : `${name}, I built you a preview`;
}

// The follow-up goes as a reply in the same thread, so it carries the
// first subject with Re: in front. A new subject reads as a second cold
// email; this reads as the same conversation.
export function followUpSubject(preview: PreviewRow) {
    return `Re: ${outreachSubject(preview)}`;
}

// One true sentence about this business, so the email could not have
// been sent to anybody else. Trimmed, and given a full stop when it has
// no closing punctuation, because it runs straight into the next
// sentence — "Your photos of the window display are lovely I've put
// together" is worse than no personal line at all.
export function personalOpening(personalLine: string | null | undefined) {
    const line = personalLine?.trim();

    if (!line) return "";

    return /[.!?]$/.test(line) ? `${line} ` : `${line}. `;
}


// What a founding place is worth, said once. When they are gone it is
// the ordinary trial instead, because naming a thing nobody can have is
// a reason to stop reading.
function foundingOffer(placesLeft: number | null) {
    const gone = placesLeft === null || placesLeft <= 0;

    return gone
        ? `You can also try Pro free for ${freeFor(TRIAL_DAYS)}.`
        : `The first ${FOUNDING_MEMBER_LIMIT} businesses also get Pro free for ${freeFor(FOUNDING_TRIAL_DAYS)}, then ${plans.pro_founding_monthly.price} a month instead of ${plans.pro_monthly.price}, for life.`;
}

// The message to send with the link, by email or a DM. It opens with what has
// been built for them rather than with us, names the two objections that stop
// people (an app, a card reader), and gives the founding price a number of
// places left so there is a reason to look today.
//
// The directory comes first and the card second, deliberately. A stamp card
// is something a dozen cheaper apps sell them; customers who have never been
// in are not. See Positioning in docs/ROADMAP.md.
//
// It signs off by name, but carries no company footer: the Companies Act
// disclosure is in the email signature, and sending it twice reads badly.
export function outreachMessage({
    preview,
    placesLeft,
    contactName,
    personalLine,
    neighbours,
}: {
    preview: PreviewRow;
    placesLeft: number | null;
    contactName: string | null;
    personalLine?: string | null;
    // Who else on their street is already here. Null until there are
    // enough of them to be worth saying (lib/neighbours.ts).
    neighbours?: Neighbours | null;
}) {
    const name = preview.businesses?.name ?? "your business";
    const handle = preview.businesses?.business_handles?.find((row) => row.is_current)?.handle;
    // The same address the DM carries, under the same condition: a
    // page that is not published has no readable row, so /@theirhandle
    // is a dead link until it is.
    const url = absoluteUrl(
        handle && isBuilt(preview)
            ? bioClaimLink(handle, preview.token)
            : previewLink(preview.token, name),
    );
    const built = isBuilt(preview) ? builtPage(preview) : null;
    const location = preview.businesses?.business_locations?.[0];
    const town = location?.cities?.name ?? location?.city?.trim() ?? "Bristol";
    // Their street, not their city. "The Bristol directory" is a place
    // in general; "the Gloucester Road page" is the one they are
    // standing on, and it exists -- /explore/[city]/[area] is a real
    // page, not a filter described generously.
    const area = location?.areas?.name?.trim() || null;

    // The personal line stands on its own now rather than running into
    // the next sentence. It is the one thing in here that could not have
    // been sent to anybody else, and a paragraph of its own is how that
    // reads as noticing rather than as a mail merge.
    const opening = personalLine?.trim();

    // "Cheers, Harry", then the signature under it. The two are not the
    // same thing: the sign-off ends the letter, and the signature is the
    // block of small print a business email has to carry. A letter that
    // stops dead at the last sentence and goes straight into a
    // registered office reads like a notice rather than a note.
    //
    // Cheers rather than Thanks, which is what signOff() has always
    // said for a named sender — they have not done anything to be
    // thanked for yet.
    return [
        `Hi ${contactName || "there"},`,
        "",
        ...(opening ? [/[.!?]$/.test(opening) ? opening : `${opening}.`, ""] : []),
        ...(built
            ? [`I've made ${name} a free link for your Instagram bio. Here it is:`, "", url]
            : [
                  `I've built a preview of ${name} on Promotello, with a free link for your Instagram bio on it. Take a look:`,
                  "",
                  url,
              ]),
        "",
        // One page, and every way in pointing at it. Each of these is
        // somewhere a customer already meets them, and none of them
        // currently join up.
        "Your offers, a stamp card, your hours and your menu on one link — the one you put in your bio. Change it once and it changes everywhere.",
        "",
        "The same page sits behind a QR poster for your window, a sheet for your tables, and a code that gets people onto your Wi-Fi.",
        "",
        // The sentence nobody else in this market can write, because we
        // own both ends: the tap, and what they do when they walk in.
        "And you see which of them worked. Linktree can tell you how many people clicked. We can tell you how many walked in.",
        "",
        // Nobody can find it yet, and saying so is the offer rather than
        // a caveat: the page is built, it is theirs, and claiming is
        // what puts it in front of anybody.
        ...(built && builtPage(preview)
            ? [
                  `Your page is already at ${builtPage(preview)}. Nobody else can find it yet — it's not in the directory or on Google until you claim it.`,
                  "",
              ]
            : []),
        // Last, and one line. A business on a high street has been
        // pitched three directories this year and is bored of them;
        // leading with ours invites the comparison we lose.
        area
            ? `Claim it and you're on the ${area} page of our ${town} directory too.`
            : `Claim it and you're in our ${town} directory too.`,
        "",
        // Named neighbours beat any argument we could make about the
        // directory, so they go directly under it -- and only when
        // there are enough of them to read as a street rather than as
        // an empty one.
        ...(neighboursLine(neighbours) ? [neighboursLine(neighbours)!, ""] : []),
        "It's free. There's no app for customers to download and nothing for you to install.",
        "",
        // Before the price, not after it: the reason to believe any of
        // this has to land before the ask does. It was written months
        // ago, tested, and then never wired into the email that goes
        // out -- so the one answer to "why risk it" from a company
        // nobody has heard of was sitting in lib doing nothing.
        ownNumbers(SIGNED_BY),
        "",
        foundingOffer(placesLeft),
        "",
        // Two links, each with a job: the page above is what convinces
        // them, and this is the one that hands it over.
        ...(built ? ["This link claims it, with no form to fill in:", "", url, ""] : []),
        built
            ? "The offers on it are only examples until you write your own. Not for you? Reply and I'll delete it."
            : "The preview is private and the offers on it are only examples. Claim it and it's yours to edit. Not for you? Reply and I'll delete it.",
        "",
        ...signOff(SIGNED_BY),
    ].join("\n");
}

// The letter, which is the third thing and the last.
//
// It goes to a business that has not answered two emails, and to every
// sole trader, who may not be emailed at all — a letter needs no
// consent, which is the whole reason paper is in the sequence.
//
// Shorter than either email, because the argument has either been made
// twice already or cannot be made by email at all. The QR code is on
// the page itself (lib/letter-background.ts), so the link is here only
// for somebody who would rather type it.
export function outreachLetter({
    preview,
    contactName,
    personalLine,
}: {
    preview: PreviewRow;
    contactName: string | null;
    personalLine?: string | null;
}) {
    const name = preview.businesses?.name ?? "your business";
    const url = absoluteUrl(previewLink(preview.token, preview.businesses?.name));

    return [
        `Dear ${contactName || "Sir or Madam"},`,
        "",
        `${personalOpening(personalLine)}I have built ${name} a page on Promotello, a new site for local businesses in Bristol, and it is waiting for you to claim.`,
        "",
        "Scan the code at the bottom of this page, or type:",
        "",
        url.replace(/^https?:\/\//, ""),
        "",
        "Your page lists your offers and a loyalty card, and it is free to claim and free to keep. Customers find you in the directory, claim an offer on their phone and show it when they pay. Nothing to install, and no card reader.",
        "",
        "If it is not for you, nothing else will arrive.",
    ].join("\n");
}

// The second email, a week later, as a reply in the same thread. Short
// because the argument was made the first time: this says it is still
// there and what it costs to find out.
export function outreachFollowUp({
    preview,
    placesLeft,
    contactName,
}: {
    preview: PreviewRow;
    placesLeft: number | null;
    contactName: string | null;
}) {
    const name = preview.businesses?.name ?? "your business";
    const url = absoluteUrl(previewLink(preview.token, preview.businesses?.name));
    const built = isBuilt(preview);
    const gone = placesLeft === null || placesLeft <= 0;

    return [
        `Hi ${contactName || "there"},`,
        "",
        built
            ? `${name}'s page is built and still waiting for you:`
            : `Your preview of ${name} is still waiting:`,
        "",
        url,
        "",
        built
            ? "It takes two minutes to claim and it's free to keep, and nobody can find it until you do. One poster in the window is all you need to start."
            : "It takes two minutes to claim and it's free to keep. One poster in the window is all you need to start.",
        "",
        // The count only once some have gone. "50 of the 50 places left"
        // is a sentence that says nobody has taken one, which is the
        // opposite of what naming a limit is for — the guard the first
        // email has always had, kept here.
        gone
            ? `You can still try Pro free for ${freeFor(TRIAL_DAYS)}.`
            : placesLeft < FOUNDING_MEMBER_LIMIT
                ? `${placesLeft} of the ${FOUNDING_MEMBER_LIMIT} founding places are left. Each comes with Pro free for ${freeFor(FOUNDING_TRIAL_DAYS)}, then ${plans.pro_founding_monthly.price} a month for life.`
                : `A founding place comes with Pro free for ${freeFor(FOUNDING_TRIAL_DAYS)}, then ${plans.pro_founding_monthly.price} a month for life.`,
        "",
        `Not for you? Reply "no thanks" and I'll delete it.`,
        "",
        ...signOff(SIGNED_BY),
    ].join("\n");
}

// Instagram, for the businesses that have an account but no address worth
// writing to — or no address at all. A DM is read on a phone in a second, so
// this is the same argument as the email at about half the length, with no
// subject and no signature.
//
// A DM is electronic mail under PECR exactly as an email is, so the sole
// trader rule applies here too: it is not a way round a business that cannot
// be emailed.
export type DmVariant = "full" | "opener";

export function outreachDm({
    preview,
    sender,
    placesLeft,
    contactName,
    personalLine,
    variant = "full",
}: {
    preview: PreviewRow;
    sender: string;
    placesLeft: number | null;
    contactName: string | null;
    personalLine?: string | null;
    variant?: DmVariant;
}) {
    const name = preview.businesses?.name ?? "your business";
    const handle = preview.businesses?.business_handles?.find((row) => row.is_current)?.handle;
    // Their address rather than ours. The token does the same work on
    // both -- the bio page checks it before showing the examples and
    // the one-tap claim -- and a DM carrying promotello.com/@jinzu
    // reads as their page where /business/preview/jinzu-<token>
    // reads as the thing people are told not to tap.
    //
    // Only once the page is built, which means listed_at is set. Until
    // then nothing can read the business row -- that is the whole of
    // the unlisted-until-claimed rule -- so /@theirhandle is a dead
    // link, and the preview page is the only address that works.
    const url = absoluteUrl(
        handle && isBuilt(preview)
            ? bioClaimLink(handle, preview.token)
            : previewLink(preview.token, name),
    );
    const location = preview.businesses?.business_locations?.[0];
    const town = location?.cities?.name ?? location?.city?.trim() ?? "Bristol";

    // A DM goes to the shop's own account, so with no contact name the
    // business name is the right thing to say — not "there", which in a
    // DM reads like it was fired at a list.
    const greeting = contactName?.trim() || name;

    const first = sender === DEFAULT_SENDER ? null : sender.trim().split(/\s+/)[0];
    const who = first
        ? `Hi ${greeting}, I'm ${first}, founder of Promotello.`
        : `Hi ${greeting}, I'm from Promotello.`;

    // Given a full stop when it has none, because in the opener it sits
    // between two sentences on one line.
    const trimmed = personalLine?.trim();
    const line = trimmed ? (/[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`) : "";

    // Asking before sending anything. A cold DM with a link in it is the
    // shape of every scam people are told to ignore, so this one carries
    // no link at all: it asks, and the link goes in the reply, where it
    // arrives in a conversation they chose to have.
    if (variant === "opener") {
        return [
            who,
            line,
            // The bio link, not the directory. This is a message sent
            // to a business on Instagram, where the one link they are
            // allowed is a problem they already have and have already
            // tried to solve. A directory page is a thing we want; a
            // tidier bio link is a thing they want.
            isBuilt(preview)
                ? `I've made ${name} a free link for your bio — your offers, a stamp card and your hours on one page — and a listing in our ${town} directory. Nobody can see it but you.`
                : `I've made ${name} a free link for your bio — your offers, a stamp card and your hours on one page — and a listing in our ${town} directory.`,
            "Want me to send it?",
        ]
            .filter(Boolean)
            .join(" ");
    }

    const founding =
        placesLeft === null || placesLeft <= 0
            ? `It's free, and you can try Pro free for ${freeFor(TRIAL_DAYS)}.`
            : `It's free, and the first ${FOUNDING_MEMBER_LIMIT} businesses get Pro free for ${freeFor(FOUNDING_TRIAL_DAYS)}.`;

    // It opens with who is writing and ends the same way the emails do.
    // A DM is still a note from a person, and one that stops dead on
    // "Not for you? Just say" reads like the end of a form.
    //
    // Only this one. The opener is a single line asking a question, and
    // a sign-off under a question is a letter pretending to be a
    // message.
    return [
        who,
        ...(line ? ["", line] : []),
        "",
        `I've made ${name} a free link for your Instagram bio. Take a look:`,
        "",
        url,
        "",
        // What goes on it, in the order a business cares about: the
        // thing they can give away today, the thing that brings people
        // back, then the everyday details they are asked for daily.
        // Kept to one line each. A DM that scrolls is a DM that gets
        // read later, which means never.
        "Your offers, a stamp card and your hours on one link, arranged how you like. It tells you what people tapped.",
        "",
        `Claim it and you're in the ${town} directory too, with a QR poster for your window.`,
        "",
        founding,
        "",
        "Not for you? Just say and I'll delete it.",
        "",
        ...signOff(SIGNED_BY),
    ].join("\n");
}
