// The stages a lead moves through, in order, and what each one means.
// Kept apart from the pages so the board, the lead record and the daily
// job all agree on one list (tests/unit/sales-pipeline.test.ts).

export const STAGES = [
    { key: "new", label: "New", blurb: "Found on a street. Nothing known yet." },
    { key: "enriched", label: "Has an address", blurb: "An email found on their own site." },
    // Not "Emailable": that word is already the badge for can_email, and
    // the two sat side by side saying the same thing twice. This stage is
    // what was done — the register has been checked — and the badge is
    // what it means.
    { key: "emailable", label: "Company checked", blurb: "On the register, so we may write to them." },
    { key: "preview", label: "Preview built", blurb: "A page exists, ready to send." },
    // Before the email, not after: the point is that the name is
    // already half-familiar when the email lands.
    { key: "social", label: "Following them", blurb: "Followed, and seen about, before we write." },
    { key: "emailed", label: "Emailed", blurb: "The first email has gone." },
    { key: "followed_up", label: "Followed up", blurb: "The second one has gone too." },
    { key: "letter", label: "Letter posted", blurb: "Paper, after the email went quiet." },
    { key: "claimed", label: "Claimed", blurb: "They took the page. Done." },
    { key: "not_interested", label: "Not interested", blurb: "They said no. Never write again." },
    { key: "dead", label: "Closed", blurb: "Gone quiet, or not for us." },
] as const;

export type Stage = (typeof STAGES)[number]["key"];

export const STAGE_LABELS: Record<string, string> = Object.fromEntries(
    STAGES.map((stage) => [stage.key, stage.label]),
);

// Still in play: everything that is not finished one way or another.
export const OPEN_STAGES = STAGES.map((stage) => stage.key).filter(
    (key) => !["claimed", "not_interested", "dead"].includes(key),
);

export type DueLead = {
    id: string;
    name: string;
    stage: string;
    can_email: boolean;
    last_touch: string | null;

    // What was actually sent, from outreach_messages, rather than what
    // the stage says. A stage can be dragged by hand; these two cannot,
    // and "has the follow-up gone" is the whole question.
    first_sent_at: string | null;
    follow_up_sent_at: string | null;
};

// What the day's work is. Follow up four to five days after the first
// email; after a fortnight of nothing, it stops being an email problem
// and becomes a letter.
//
// Pure, and given "now", so the dates can be tested rather than waited
// for. Nothing in here sends anything: it decides who is due.
// The sequence, in days. Named once because the rule that decides what
// is due and the words on the lead page that explain it have to agree —
// a page saying "worth leaving until Friday" beside a rule that fires on
// Thursday is worse than either alone.
export const FOLLOW_UP_AFTER_DAYS = 4;
export const LETTER_AFTER_DAYS = 14;

export function daysSince(when: string | null, now: Date = new Date()) {
    if (!when) return null;

    return Math.floor((now.getTime() - new Date(when).getTime()) / 86_400_000);
}

export function followUpDue(firstSentAt: string | null, now: Date = new Date()) {
    const days = daysSince(firstSentAt, now);

    return days !== null && days >= FOLLOW_UP_AFTER_DAYS;
}

export function letterDue(lastTouch: string | null, now: Date = new Date()) {
    const days = daysSince(lastTouch, now);

    return days !== null && days >= LETTER_AFTER_DAYS;
}

// The day it comes due, written the way a date is read rather than
// counted: "23 November" beats "in 3 days", which goes stale the moment
// the page is left open.
export function dueDate(from: string, days: number) {
    const date = new Date(new Date(from).getTime() + days * 86_400_000);

    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

// How long ago, in the words somebody would use out loud.
export function whenSaid(when: string, now: Date = new Date()) {
    const days = daysSince(when, now) ?? 0;

    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 14) return `${days} days ago`;
    if (days < 60) return `${Math.floor(days / 7)} weeks ago`;

    return `${Math.floor(days / 30)} months ago`;
}

export function dueToday(leads: DueLead[], now: Date) {
    const days = (since: string | null) =>
        since ? Math.floor((now.getTime() - new Date(since).getTime()) / 86_400_000) : null;

    const followUp: DueLead[] = [];
    const letter: DueLead[] = [];

    for (const lead of leads) {
        const age = days(lead.last_touch);

        if (age === null) continue;

        // Four days after the first email actually went, and only while
        // no follow-up has. Claimed and Not interested never reach here:
        // the caller does not ask about them, and a lead that answered
        // is not owed a chase.
        const since = days(lead.first_sent_at);

        if (since !== null && since >= FOLLOW_UP_AFTER_DAYS && !lead.follow_up_sent_at) {
            followUp.push(lead);
            continue;
        }

        // A fortnight after the last thing we did, whether that was the
        // first email or the follow-up. A lead we may not email at all
        // arrives here too: a letter needs no consent, which is the
        // whole reason it is in the sequence.
        // "Following them" counts the same as "Preview built": a page
        // exists and nothing has been written to them. A lead left in
        // either for a fortnight was invisible to this rule, which is
        // how a sole trader — reachable by post and nothing else — could
        // sit there for good.
        if (["emailed", "followed_up", "preview", "social"].includes(lead.stage) && age >= LETTER_AFTER_DAYS) {
            letter.push(lead);
        }
    }

    return { followUp, letter };
}

// What a line in the history is called. The kind is a column value —
// "companies_house_checked", "note" — and printing it with the
// underscores taken out gave headings nobody writes: "note" above the
// only words that carried any meaning, and "email found" above an email
// somebody had typed in themselves.
//
// Named after what happened, in the words the board uses for the stages
// these sit beside.
export const EVENT_LABELS: Record<string, string> = {
    added: "Added",
    followed_social: "Followed them",
    imported: "Imported",
    email_found: "Email",
    companies_house_checked: "Companies House",
    preview_built: "Preview built",
    emailed: "Emailed",
    followed_up: "Followed up",
    letter_sent: "Letter posted",
    replied: "Replied",
    claimed: "Claimed",
    closed: "Closed",
    note: "",
};

export function eventLabel(kind: string) {
    return EVENT_LABELS[kind] ?? kind.replace(/_/g, " ");
}

// One line for where a lead is, built when it is shown.
//
// This was a column, written by whoever last touched an address — the
// crawler wrote it, saving the address form wrote it, and adding a lead
// did not. So a lead typed in on /admin/sales/new had a street and a
// postcode and no line at all, and the pipeline showed nothing under its
// name until somebody pressed Save this address for no other reason.
//
// Derived, it cannot disagree with the parts it is made of, and the
// writer that forgets is impossible rather than fixed. What the crawler
// actually found is still kept: it goes into the history as a note, in
// the words that were on the page.
export function leadAddress(lead: {
    address_line_1?: string | null;
    address_line_2?: string | null;
    postcode?: string | null;
    cities?: { name: string } | { name: string }[] | null;
}) {
    const cities = lead.cities;
    const town = Array.isArray(cities) ? cities[0]?.name : cities?.name;

    // In the order an envelope wants them: street, locality, town,
    // postcode (20270211090000).
    return (
        [lead.address_line_1, lead.address_line_2, town, lead.postcode].filter(Boolean).join(", ") ||
        null
    );
}
