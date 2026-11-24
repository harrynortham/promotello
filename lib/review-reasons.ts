// Why something wasn't approved, in words, in one place.
//
// Before this, a decline sent three messages that between them said
// nothing: an email listing the reasons it *might* have been, a
// notification claiming "we've emailed you why", and a red chip. The
// business was told it had been turned down and left to guess.
//
// So a decline now carries a cause. The admin picks one, writes a note
// if there is more to say, and these are the words every surface uses:
// the email, the notification, the dashboard banner and the offer card.
// Keeping them here is the point — the code is stored on the row, the
// sentences are not, so wording can be improved without a migration and
// without four copies drifting apart.

export type ReviewReason = {
    // Stored on the row. Short, stable, never shown to anybody.
    code: string;
    // What the admin picks from.
    label: string;
    // What the business reads: why it was turned down. Empty for
    // "something else", where the note is the whole message.
    says: string;
    // What to do about it. Always something they can act on today.
    fix: string;
};

export type ReviewOf = "business" | "offer";

// Turned down before it was ever live, or taken down after it was.
// Different causes, a different message, and for a suspension a page
// that was working yesterday — so they are never the same list.
export type ReviewAction = "rejected" | "suspended";

// The anchors in /business/help. The help article and the email say the
// same thing, so the link has somewhere to land. Suspension is one
// article for both sides: what it means and how to get back.
export const HELP_ANCHORS = {
    business: "business-declined",
    offer: "offer-declined",
    suspended: "suspended",
} as const;

export const BUSINESS_REASONS: ReviewReason[] = [
    {
        code: "address",
        label: "Address we couldn't place",
        says: "We couldn't place your address on a map, so customers looking nearby wouldn't find you.",
        fix: "Open your business profile and enter the address customers walk to, with its postcode.",
    },
    {
        code: "no-premises",
        label: "No public premises",
        says: "Promotello lists places customers can walk into, and we couldn't find a public address for this business.",
        fix: "If you do serve customers somewhere, add that address to your profile and send it back to us.",
    },
    {
        code: "thin-profile",
        label: "Profile too thin to publish",
        says: "There wasn't enough on your page yet for somebody to tell what you do or whether to visit.",
        fix: "Add a description, a logo and your opening hours, then send it for review again.",
    },
    {
        code: "details-disagree",
        label: "Details don't agree",
        says: "Your name, category and description describe different businesses, so we couldn't tell which is right.",
        fix: "Put them right in your business profile and send it back to us.",
    },
    {
        code: "cant-verify",
        label: "Couldn't verify it's yours",
        says: "We couldn't confirm that this business is yours to run, and we won't publish a page somebody else might own.",
        fix: "Reply from an email address at the business, or send us a link to its own website or listing.",
    },
    {
        code: "duplicate",
        label: "Already on Promotello",
        says: "This business is already on Promotello, so we've left the page that's there in place rather than splitting it in two.",
        // Pages first means the page that is already there is usually one
        // we built, and it has a claim button on it. Sending them to it
        // beats sending them to an inbox: "reply and wait" was the whole
        // reason they signed up a second time instead.
        fix: "Open your page on Promotello and press \u201cClaim your free page\u201d, and we'll hand it over. Or reply to this email and we'll sort it out.",
    },
    {
        code: "not-listed",
        label: "Not a trade we list",
        says: "This isn't a kind of business we're able to list on Promotello.",
        fix: "Reply to this email if you think we've got it wrong — we'd rather be corrected than lose you.",
    },
    {
        code: "other",
        label: "Something else (write it below)",
        says: "",
        fix: "Reply to this email and we'll help you put it right.",
    },
];

export const OFFER_REASONS: ReviewReason[] = [
    {
        code: "unclear",
        label: "Not clear what the customer gets",
        says: "It wasn't clear what a customer actually gets, so somebody claiming it could arrive expecting something else.",
        fix: "Say the thing and the saving in the offer itself: what they get, and what it costs them.",
    },
    {
        code: "hard-to-check",
        label: "Hard to check while serving",
        says: "Your staff would have to work out whether it applies while somebody is standing there waiting.",
        fix: "Make it one rule anybody can check in a second, without doing sums or asking a manager.",
    },
    {
        code: "terms-do-the-work",
        label: "Conditions hidden in the terms",
        says: "The headline promises more than the terms allow, so the terms are doing the work the offer should.",
        fix: "Move the conditions that change the deal into the offer itself, and keep the terms for small print.",
    },
    {
        code: "nothing-off",
        label: "Nothing actually off",
        says: "Nothing is actually cheaper or free here, so there's no reason for somebody to make the trip.",
        fix: "Pick one thing and take something real off it, even for a week.",
    },
    {
        code: "kind-mismatch",
        label: "Type and wording disagree",
        says: "The type of offer you chose and the wording don't agree, so it would be filed under the wrong filter and shown wrongly.",
        fix: "Open the offer, choose the type that matches what you're giving, and check the headline it builds.",
    },
    {
        code: "end-date",
        label: "End date won't work",
        says: "The end date had already gone by, or was too close for anybody to act on.",
        fix: "Give it an end date far enough ahead that a customer can plan a visit around it.",
    },
    {
        code: "restricted",
        label: "Restricted goods",
        says: "We can't publish an offer on this kind of product.",
        fix: "Reply to this email and we'll tell you what we can run for you instead.",
    },
    {
        code: "other",
        label: "Something else (write it below)",
        says: "",
        fix: "Reply to this email and we'll help you put it right.",
    },
];

// Taking down something that was live is a different conversation. The
// causes are about what has happened since, not about the writing, and
// the business is standing in front of a page that worked yesterday.
export const BUSINESS_SUSPENSIONS: ReviewReason[] = [
    {
        code: "complaints",
        label: "Customers say an offer wasn't honoured",
        says: "Customers have told us an offer here wasn't honoured the way it was written, so we've taken the page down while we sort it out.",
        fix: "Reply to this email and tell us what happened. Most of these are a misunderstanding at the counter and are back up the same day.",
    },
    {
        code: "unreachable",
        label: "We couldn't reach you",
        says: "We've tried to reach you about this page and haven't heard back, so we've taken it down rather than leave customers walking into something out of date.",
        fix: "Reply to this email and we'll put it straight back up.",
    },
    {
        code: "details-changed",
        label: "The business has changed",
        says: "The business looks to have moved, closed or changed hands, and the page no longer describes it.",
        fix: "Tell us what's changed, or put the profile right yourself, and we'll put it back.",
    },
    {
        code: "at-your-request",
        label: "You asked us to",
        says: "You asked us to take the page down.",
        fix: "Reply to this email whenever you want it back and we'll restore it, offers and all.",
    },
    {
        code: "under-review",
        label: "Something reported, under review",
        says: "Something has been reported to us and we've paused the page while we look at it. This isn't a decision.",
        fix: "Reply to this email and we'll tell you exactly what was reported.",
    },
    {
        code: "other",
        label: "Something else (write it below)",
        says: "",
        fix: "Reply to this email and we'll sort it out with you.",
    },
];

export const OFFER_SUSPENSIONS: ReviewReason[] = [
    {
        code: "not-honoured",
        label: "Customers say it wasn't honoured",
        says: "Customers have told us this offer wasn't honoured the way it reads, so we've taken it off the site while we sort it out.",
        fix: "Reply to this email and tell us what happened, or edit the offer so it says what you can give.",
    },
    {
        code: "no-longer-available",
        label: "What's on offer has gone",
        says: "The thing this offer gives doesn't look to be available any more.",
        fix: "Edit the offer to something you can give today, and it goes back up when we've checked it.",
    },
    {
        code: "misleading",
        label: "Promises more than it gives",
        says: "Reading it again, it promises more than it turns out to give, and somebody claiming it would arrive expecting something else.",
        fix: "Edit the headline so it matches what happens at the counter.",
    },
    {
        code: "at-your-request",
        label: "You asked us to",
        says: "You asked us to take this offer down.",
        fix: "Reply to this email whenever you want it back, or write a new one in its place.",
    },
    {
        code: "under-review",
        label: "Something reported, under review",
        says: "Something has been reported to us about this offer and we've paused it while we look. This isn't a decision.",
        fix: "Reply to this email and we'll tell you exactly what was reported.",
    },
    {
        code: "other",
        label: "Something else (write it below)",
        says: "",
        fix: "Reply to this email and we'll sort it out with you.",
    },
];

export function reasonsFor(of: ReviewOf, action: ReviewAction) {
    if (action === "suspended") {
        return of === "business" ? BUSINESS_SUSPENSIONS : OFFER_SUSPENSIONS;
    }

    return of === "business" ? BUSINESS_REASONS : OFFER_REASONS;
}

export function findReason(of: ReviewOf, action: ReviewAction, code: string | null | undefined) {
    if (!code) return null;
    return reasonsFor(of, action).find((reason) => reason.code === code) ?? null;
}

// A note is only text somebody typed, so it is trimmed, capped and —
// where it is the whole message — required. 'other' with an empty note
// is the old generic decline wearing a code.
export const NOTE_MAX = 400;

export function tidyNote(note: string | null | undefined) {
    const text = (note ?? "").trim().slice(0, NOTE_MAX);
    return text === "" ? null : text;
}

export function noteIsRequired(code: string) {
    return code === "other";
}

export function declineIsComplete(
    of: ReviewOf,
    action: ReviewAction,
    code: string,
    note: string | null | undefined,
) {
    const reason = findReason(of, action, code);
    if (!reason) return false;
    return !noteIsRequired(code) || tidyNote(note) !== null;
}

// The lines a decline turns into, in order, wherever it is shown. The
// note goes between the cause and the fix: it is the specific thing
// about this business, and the fix is what to do about it.
export function declineLines(
    of: ReviewOf,
    action: ReviewAction,
    code: string | null | undefined,
    note?: string | null,
): string[] {
    const reason = findReason(of, action, code);
    const written = tidyNote(note);

    if (!reason) {
        // Everything declined before this existed. Say the true thing
        // rather than inventing a cause for it.
        return written ? [written] : [];
    }

    return [reason.says, written, reason.fix].filter((line): line is string => Boolean(line));
}

// One line, for a notification, where there is no room for three. The
// note wins over the stock sentence: it was written about them.
export function declineSummary(
    of: ReviewOf,
    action: ReviewAction,
    code: string | null | undefined,
    note?: string | null,
): string | null {
    const reason = findReason(of, action, code);
    const written = tidyNote(note);

    if (!reason) return written;
    if (reason.says === "") return written;

    return written ?? reason.says;
}

// The same sentence, for a page rather than an inbox.
//
// Every `fix` is written for the email it is sent in, where "reply to
// this email" is the lowest-friction thing a business can do. The help
// articles are built from these same lists so the two cannot disagree
// — but on a web page there is no email to reply to, and four of these
// sentences said so anyway.
export function fixOnAPage(fix: string) {
    return fix
        .replace(/^Reply to this email and tell us/, "Get in touch and tell us")
        .replace(/^Reply to this email whenever/, "Get in touch whenever")
        .replace(/^Reply to this email if/, "Get in touch if")
        .replace(/^Reply to this email and/, "Get in touch and");
}

export function helpAnchor(of: ReviewOf, action: ReviewAction) {
    return `/business/help#${action === "suspended" ? HELP_ANCHORS.suspended : HELP_ANCHORS[of]}`;
}
