import { FOUNDING_MEMBER_LIMIT, PRO_SUBSCRIPTION_STATUSES, TRIAL_DAYS, countFoundingMembers, plans } from "@/lib/billing";
import { brandedEmail, emailCompanyFooter, escapeHtml, sendEmails, type Email } from "@/lib/email";
import { companyDisclosure } from "@/lib/legal";
import { absoluteUrl } from "@/lib/site";
import { releaseClaims } from "@/lib/email-claims";
import { createAdminClient } from "@/utils/supabase/admin";

// Emails that guide a new business through setup, on to a free Pro trial
// and through it, in place of an in-person setup visit. The database decides what's due
// (claim_business_lifecycle_emails) and records each send, so running
// this twice never emails anyone twice.

export type LifecycleKind =
    | "welcome"
    | "setup_nudge_1"
    | "setup_nudge_2"
    | "trial_ending"
    | "loyalty_pitch"
    | "founding_places"
    | "results"
    | "check_in";

// Who the personal check-in email comes from.
const FOUNDER = { name: "Harry", title: "Founder, Promotello" };

export type LifecycleDue = {
    business_id: string;
    business_name: string;
    kind: LifecycleKind;
    emails: string[];
    details: {
        has_offer: boolean;
        has_loyalty: boolean;
        has_poster: boolean;
        // The five the send button is locked behind, and the flag the
        // database works out from them. Older payloads carry none of
        // these: absent means done, so nobody is chased for a thing we
        // cannot see.
        has_logo?: boolean;
        has_description?: boolean;
        has_address?: boolean;
        has_hours?: boolean;
        has_cover: boolean;
        profile_ready?: boolean;
        // Older payloads don't carry it. Absent means sent, so nobody is
        // asked to send a page they already did.
        sent_for_review?: boolean;
        trial_end: string | null;
        // Whether the ending trial has a card behind it. Absent on older
        // payloads, and absent means yes: every trial started before
        // 20270109090000 took a card to begin.
        trial_has_card?: boolean;
        since: string;
        followers: number;
        loyalty_members: number;
        claims: number;
        visits: number;
        qr_scans: number;
        views: number;
    };
    // Added here rather than by the database: whether it's on Pro or a
    // trial, and whether it's been approved yet.
    hasPro: boolean;
    approved: boolean;
};

type StepKey =
    | "logo"
    | "description"
    | "address"
    | "hours"
    | "cover"
    | "review"
    | "offer"
    | "loyalty"
    | "poster";

type Step = { key: StepKey; label: string; why: string; path: string; action: string };

// The same seven things the dashboard counts (lib/setup-steps.ts), in
// the order it counts them, and then the two that come after going
// live. They have to be the same list: an email that names a step the
// dashboard has never heard of sends somebody looking for a page that
// isn't there, and a dashboard step no email mentions is one nobody is
// ever chased about.
//
// A loyalty card is part of Pro, so it is only a step for a business
// that can actually start one. On Free it is not an unfinished page,
// it is a thing to buy — which has an email of its own to make that
// case ('loyalty_pitch') rather than being dressed up as setup.
function setupSteps(businessId: string, hasPro: boolean): Step[] {
    const base = `/business/${businessId}`;

    return [
        {
            key: "logo",
            label: "Add your logo",
            why: "Customers recognise you by it — on your page, on your offers and on your stamp card.",
            path: `${base}/logo`,
            action: "Add your logo",
        },
        {
            key: "description",
            label: "Say what you're known for",
            why: "Two or three sentences. It sits under your name wherever people find you.",
            path: `${base}/description`,
            action: "Write a description",
        },
        {
            key: "address",
            label: "Add your address",
            why: "So customers can get directions, and so you turn up when somebody browses your part of town.",
            path: `${base}/address`,
            action: "Add your address",
        },
        {
            key: "hours",
            label: "Add your opening hours",
            why: "Shown on your page, so nobody arrives at a closed door.",
            path: `${base}/hours`,
            action: "Add your hours",
        },
        {
            key: "cover",
            label: "Add a cover photo",
            why: "The picture across the top of your page, and the one customers see on your card in the directory. It is the first thing they look at.",
            path: `${base}/cover`,
            action: "Add a cover photo",
        },
        {
            key: "review",
            label: "Send your page for review",
            why: "Nothing on your page is public until you have looked it over and sent it to us. Change anything that isn't right first, then send it — we read every page, usually the same day.",
            path: `${base}#send-for-review`,
            action: "Send it for review",
        },
        {
            key: "offer",
            label: "Post your first offer",
            why: "An offer gives new customers a reason to visit, and it shows on your page and across the Promotello directory.",
            path: `${base}/offers/new`,
            action: "Create an offer",
        },
        ...(hasPro
            ? [
                {
                    key: "loyalty" as const,
                    label: "Set up your loyalty card",
                    why: "A digital stamp card turns first-time visitors into regulars. Customers join from your page in the directory or by scanning your poster — so people who have never been in can join too — and your staff add a stamp by scanning the customer's phone with your own.",
                    path: `${base}/loyalty`,
                    action: "Set up a loyalty card",
                },
            ]
            : []),
        {
            key: "poster",
            label: "Print your QR poster",
            why: "A poster in your window or by the counter is how passers-by find your offers. It takes a minute to print.",
            path: `${base}/qr`,
            action: "Get your poster",
        },
    ];
}

// "Three things", not "3 things": these are sentences, and the list is
// never long enough to need a numeral.
// Bare numerals for a count that already has its noun in the sentence
// around it: "three more", not "three things more".
function numberInWords(count: number) {
    const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

    return words[count] ?? String(count);
}

function countInWords(count: number) {
    const words = ["No things", "One thing", "Two things", "Three things", "Four things", "Five things"];

    return words[count] ?? `${count} things`;
}

function sentForReview(due: LifecycleDue) {
    return due.details.sent_for_review !== false;
}

// Nothing left to send: either they have sent it, or it is already live,
// which means somebody here has read it.
function alreadySeen(due: LifecycleDue) {
    return sentForReview(due) || due.approved;
}

// Absent means done: an older payload cannot be chased for something
// it never carried.
function has(flag: boolean | undefined) {
    return flag !== false;
}

function profileReady(due: LifecycleDue) {
    return due.details.profile_ready !== false;
}

function missingSteps(due: LifecycleDue) {
    const done: Record<StepKey, boolean> = {
        logo: has(due.details.has_logo),
        description: has(due.details.has_description),
        address: has(due.details.has_address),
        hours: has(due.details.has_hours),
        cover: due.details.has_cover,
        review: alreadySeen(due),
        offer: due.details.has_offer,
        loyalty: due.details.has_loyalty,
        poster: due.details.has_poster,
    };

    return setupSteps(due.business_id, due.hasPro).filter((step) => !done[step.key]);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" }).format(new Date(value));
}

function plural(count: number, one: string, many: string) {
    return `${count} ${count === 1 ? one : many}`;
}

// How much of a case the numbers make for themselves.
//
// Reciting whatever is above zero is how a business gets told it has
// had "3 page views" and is then asked for a card. A thin list is worse
// than no list: it is a month of evidence that nothing happened, in our
// own words, at the moment somebody is deciding whether to keep paying.
//
// A visit — a voucher used or a stamp added — is the only number that
// proves the thing worked, because somebody walked in. Claims, card
// members and followers are people who decided something, so they are
// interest. Views and scans are neither: they are anonymous by design
// (20261229090000), and nobody ever renewed over a page view.
export function resultsStrength(d: LifecycleDue["details"]) {
    if (d.visits > 0) return "visits" as const;

    if (d.claims > 0 || d.loyalty_members > 0 || d.followers > 0) return "interest" as const;

    return "nothing" as const;
}

// The interest, for the email that has no visits to talk about.
function interestList(d: LifecycleDue["details"]) {
    return [
        d.loyalty_members > 0 && plural(d.loyalty_members, "person is", "people are") + " carrying your loyalty card",
        d.followers > 0 && plural(d.followers, "person follows", "people follow") + " you for new offers",
        d.claims > 0 && plural(d.claims, "voucher has", "vouchers have") + " been claimed",
    ].filter(Boolean) as string[];
}

// What it's had through Promotello, e.g. ["3 customer visits", "12 page views"].
function resultsList(d: LifecycleDue["details"]) {
    return [
        d.visits > 0 && plural(d.visits, "customer visit", "customer visits"),
        d.loyalty_members > 0 && plural(d.loyalty_members, "loyalty card member", "loyalty card members"),
        d.followers > 0 && plural(d.followers, "follower", "followers"),
        d.claims > 0 && plural(d.claims, "voucher claimed", "vouchers claimed"),
        d.qr_scans > 0 && plural(d.qr_scans, "poster scan", "poster scans"),
        d.views > 0 && plural(d.views, "page view", "page views"),
    ].filter(Boolean) as string[];
}

// A business that signs up and does nothing reads several of these within
// three weeks, so they say the same three things in different words rather
// than the same sentence four times: how long it's free, that starting
// takes no card, and that it stops by itself unless they decide to keep
// it. Shortening any of them to "free for ${TRIAL_DAYS} days" would drop
// the no-card part, which is the whole of the objection being answered.
//
// These used to say a card was taken at the start, because it was.
// docs/LAUNCH-FUNNEL.md is why it isn't.
export const trialTerms = {
    pitch: `Pro is free for ${TRIAL_DAYS} days and starting takes no card. Add one before the end to keep it, or let it stop on its own — either way nothing is charged in the meantime.`,
    founding: `A place is held the moment you start the trial — ${TRIAL_DAYS} days free, no card to start it, and nothing charged unless you decide at the end to keep it.`,
    adds: `The first ${TRIAL_DAYS} days are free and there's no card to start. Add one before the trial is up to carry on, or do nothing and it stops by itself.`,
    results: `Trying it is free for ${TRIAL_DAYS} days with no card to begin, and it stops by itself unless you add one — so there's nothing to remember to cancel.`,
};

// The token lets someone stop these without signing in, which is what the
// List-Unsubscribe header needs and what the visible link should offer too.
// Without one (an older claim, or a user with no settings row yet) it falls
// back to the preferences page.
function optOutUrl(token?: string) {
    return token ? absoluteUrl(`/unsubscribe/${token}`) : absoluteUrl("/account/notifications");
}

function unsubscribeHeaders(token?: string) {
    if (!token) return undefined;

    const oneClick = absoluteUrl(`/api/unsubscribe/${token}`);

    return {
        "List-Unsubscribe": `<${oneClick}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
}

function tipsFooter(token?: string) {
    return {
        footer: "You're getting this because you run a business on Promotello. We'll only send a few tips while you get started.",
        footerLinks: [{ label: "Turn off setup tips", url: optOutUrl(token) }],
    };
}

// foundingPlacesLeft: founding member places still open, or null if unknown.
export function lifecycleEmail(
    due: LifecycleDue,
    to: string,
    { foundingPlacesLeft = null, unsubscribeToken }: { foundingPlacesLeft?: number | null; unsubscribeToken?: string } = {},
): Email | null {
    const name = due.business_name;
    const dashboard = absoluteUrl(`/business/${due.business_id}`);
    const missing = missingSteps(due);

    // welcome and trial_ending always send, whatever the setting says (see
    // claim_business_lifecycle_emails). Offering an unsubscribe on those
    // would promise something it cannot honour, so they carry none.
    const optOutToken = due.kind === "welcome" || due.kind === "trial_ending" ? undefined : unsubscribeToken;

    if (due.kind === "welcome") {
        // The first few, named, and the rest left to the checklist: a
        // welcome that lists nine things is a wall rather than a
        // beginning, and the dashboard counts them off anyway.
        const steps = missingSteps(due);
        const first = steps.slice(0, 3);
        const rest = steps.length - first.length;

        const { html, text } = brandedEmail({
            eyebrow: "Welcome to Promotello",
            title: `${name} is on Promotello`,
            paragraphs: [
                `Thanks for signing up. Your page is started — here is what it needs before customers can find you${rest > 0 ? ", and your dashboard counts off the rest as you go" : ""}:`,
                ...first.map((step, index) => `${index + 1}. ${step.label}. ${step.why}`),
                rest > 0
                    ? `Then ${numberInWords(rest)} more, none of them long: your dashboard keeps the list.`
                    : "Your dashboard keeps the list, and you can work through it at your own pace.",
                ...(due.approved
                    ? []
                    : ["We check every new business before it appears to customers. You can set everything up in the meantime, and we'll email you as soon as you're live."]),
            ],
            action: { label: "Open your dashboard", url: dashboard },
            footer: "You're getting this because you just added your business to Promotello.",
        });

        return { to, subject: `Welcome to Promotello: getting ${name} set up`, html, text, headers: unsubscribeHeaders(optOutToken) };
    }

    if (due.kind === "setup_nudge_1") {
        const next = missing[0];

        if (!next) return null;

        const others = missing.slice(1).map((step) => step.label.toLowerCase());
        const { html, text } = brandedEmail({
            eyebrow: "Your next step",
            title: `${next.label} for ${name}`,
            paragraphs: [
                next.why,
                others.length > 0
                    ? `After that: ${others.join(" and ")}. Then you're ready for customers.`
                    : "That's the last step, and then you're ready for customers.",
            ],
            action: { label: next.action, url: absoluteUrl(next.path) },
            ...tipsFooter(optOutToken),
        });

        return { to, subject: `${next.label} for ${name}`, html, text, headers: unsubscribeHeaders(optOutToken) };
    }

    // A business only gets the second nudge if nothing has changed since the
    // first, so leading with the same step would repeat that email word for
    // word, down to the subject line. This one counts what's left instead.
    if (due.kind === "setup_nudge_2") {
        const next = missing[0];

        if (!next) return null;

        const remaining = missing.map((step) => step.label.toLowerCase());
        const counted = countInWords(remaining.length);
        const unsent = !sentForReview(due);
        // One click only when it really is one: the send button is
        // locked until the page has a logo, a description, an address,
        // hours and a cover photo.
        const oneClick = unsent && profileReady(due);
        const title = oneClick
            ? `${name} isn't live yet, and one click would do it`
            : unsent
                ? `${name} isn't live yet`
                : `${counted} left before customers can find ${name}`;
        const list = remaining.length === 2
            ? remaining.join(" and ")
            : `${remaining.slice(0, -1).join(", ")} and ${remaining[remaining.length - 1]}`;

        const { html, text } = brandedEmail({
            eyebrow: "Still to do",
            title,
            paragraphs: [
                oneClick
                    ? `Nothing on your page is public until you send it to us, and you haven't yet. Have a look through it, change anything that isn't right, and send it — we usually look the same day.`
                    : unsent
                        ? `Nothing on your page is public until you send it to us, and there is a little to finish first: ${list}. Then the button is there on your dashboard, and we usually look the same day.`
                        : remaining.length === 1
                        ? `Your page is set up apart from one thing: ${remaining[0]}.`
                        : `Your page is set up, but it stays quiet until the rest is done: ${list}.`,
                oneClick && remaining.length > 1
                    ? `Still to do after that: ${remaining.filter((item) => !item.startsWith("send your page")).join(", ")}.`
                    : "Each one takes a few minutes, and you can stop after any of them. New offers are read by our team before they appear, usually the same day.",
            ],
            action: { label: next.action, url: absoluteUrl(next.path) },
            ...tipsFooter(optOutToken),
        });

        return { to, subject: title, html, text, headers: unsubscribeHeaders(optOutToken) };
    }

    if (due.kind === "trial_ending" && due.details.trial_end) {
        const d = due.details;
        const trialEnd = formatDate(due.details.trial_end);
        const results = resultsList(d);

        // A trial started without a card ends by stopping, not by
        // charging, so this is two different emails. Older payloads
        // carry no flag and every one of those trials took a card.
        const hasCard = d.trial_has_card !== false;

        const { html, text } = brandedEmail({
            eyebrow: "Your free trial",
            title: hasCard
                ? `Your trial ends on ${trialEnd}`
                : `${name} goes back to Free on ${trialEnd}`,
            paragraphs: [
                // The same rule as the results email, and it matters
                // more here: this is the last thing somebody reads
                // before deciding, and a thin list of page views is an
                // argument for letting it lapse.
                resultsStrength(d) === "visits"
                    ? `Since ${formatDate(d.since)}, ${name} has had ${results.join(", ")} through Promotello.`
                    : resultsStrength(d) === "interest"
                        ? `${interestList(d).join(", and ")} since ${formatDate(d.since)}. Nobody has been in and used one yet — the next stamp or voucher is the one that starts it.`
                        : `${name} hasn't had customers through Promotello yet. ${missing.length > 0 ? `${missing[0].label} to get started: ${missing[0].why}` : "Mention your loyalty card when you serve somebody — that is where the first sign-ups come from."}`,
                hasCard
                    ? "Your plan carries on automatically when the trial ends, so you don't need to do anything. You can change or cancel your plan in Billing before then."
                    : "You started this without a card, so nothing is charged and nothing will be: it simply stops on that date unless you add one.",
                ...(hasCard
                    ? []
                    : ["On Free your page stays up and your stamp card keeps working for everyone already on it — but you can't start another card, offers past the first come off the directory, and your followers stop hearing about new ones."]),
            ],
            action: {
                label: hasCard ? "Review your plan" : "Add a card and keep it",
                url: absoluteUrl(`/business/${due.business_id}/billing`),
            },
            footer: "You're getting this because your business is on a Promotello free trial.",
        });

        return {
            to,
            subject: hasCard
                ? `Your Promotello trial ends on ${trialEnd}`
                : `Keep ${name} on Pro — your trial ends on ${trialEnd}`,
            html,
            text,
            headers: unsubscribeHeaders(optOutToken),
        };
    }

    const billing = absoluteUrl(`/business/${due.business_id}/billing`);
    const tryPro = { label: `Try Pro free for ${TRIAL_DAYS} days`, url: billing };

    if (due.kind === "loyalty_pitch") {
        const { html, text } = brandedEmail({
            eyebrow: "Loyalty cards",
            title: `Turn ${name}'s first-time visitors into regulars`,
            paragraphs: [
                "Paper stamp cards get lost, forgotten and put through the wash. A Promotello loyalty card lives on your customers' phones, so they always have it with them.",
                "You choose the reward, like a free coffee after nine. Customers join from your page in the Promotello directory or by scanning your poster — so somebody who has never been in can join before their first visit — and your staff add a stamp by scanning the customer's phone with your own. When the card is full they show it to you and you hand the reward over.",
                `Loyalty cards are part of Pro, ${plans.pro_monthly.price} a month. ${trialTerms.pitch}`,
            ],
            action: tryPro,
            ...tipsFooter(optOutToken),
        });

        return { to, subject: `A loyalty card for ${name}, free for ${TRIAL_DAYS} days`, html, text, headers: unsubscribeHeaders(optOutToken) };
    }

    if (due.kind === "founding_places") {
        const proAdds = `Pro adds a digital loyalty card, as many live offers as you like, Google review requests after each visit, and an email to your followers whenever a new offer of yours goes live. It's ${plans.pro_monthly.price} a month.`;
        const proAddsWithoutPrice = proAdds.replace(` It's ${plans.pro_monthly.price} a month.`, "");
        const founding = plans.pro_founding_monthly.price;

        const { html, text } = foundingPlacesLeft && foundingPlacesLeft > 0
            ? brandedEmail({
                eyebrow: "Founding members",
                title: `Lock in ${founding} a month for ${name}, for life`,
                paragraphs: [
                    `The first ${FOUNDING_MEMBER_LIMIT} businesses on Pro pay ${founding} a month for as long as they stay, instead of ${plans.pro_monthly.price}. ${foundingPlacesLeft === 1 ? "There's 1 place left." : `There are ${foundingPlacesLeft} places left.`}`,
                    proAddsWithoutPrice,
                    trialTerms.founding,
                ],
                    action: { label: "Claim a founding place", url: billing },
                ...tipsFooter(optOutToken),
            })
            : brandedEmail({
                eyebrow: "Promotello Pro",
                title: `What Pro adds for ${name}`,
                paragraphs: [proAdds, trialTerms.adds],
                    action: tryPro,
                ...tipsFooter(optOutToken),
            });

        return {
            to,
            subject: foundingPlacesLeft && foundingPlacesLeft > 0
                ? `${founding} a month for life: founding member places for ${name}`
                : `What Pro adds for ${name}`,
            html,
            text,
            headers: unsubscribeHeaders(optOutToken),
        };
    }

    if (due.kind === "results") {
        const d = due.details;
        const strength = resultsStrength(d);

        // Somebody walked in. That is the whole case, so lead with it.
        if (strength === "visits") {
            const { html, text } = brandedEmail({
                eyebrow: "Your first two weeks",
                title: `How ${name} is doing on Promotello`,
                paragraphs: [
                    `Since ${formatDate(d.since)}, ${name} has had ${resultsList(d).join(", ")} through Promotello.`,
                    `Pro helps bring those customers back: they join your loyalty card and return for their next stamp, and your followers hear about every new offer. It's ${plans.pro_monthly.price} a month.`,
                    trialTerms.results,
                ],
                action: tryPro,
                ...tipsFooter(optOutToken),
            });

            return { to, subject: `${name}'s first two weeks on Promotello`, html, text, headers: unsubscribeHeaders(optOutToken) };
        }

        // People have decided something — joined the card, followed,
        // claimed — but nobody has been in yet. That is a real thing to
        // say, and it is nearly a customer rather than nearly nothing.
        if (strength === "interest") {
            const interest = interestList(d);

            const { html, text } = brandedEmail({
                eyebrow: "Your first two weeks",
                title: `People are finding ${name}`,
                paragraphs: [
                    `${interest.join(", and ")} — all since ${formatDate(d.since)}. Nobody has been in and used one yet, which is the next thing to change.`,
                    d.claims > 0
                        ? "A claimed voucher is somebody who meant to come. Mentioning the offer when you serve people, and keeping your poster where they wait, is usually what turns the last few into a visit."
                        : "The quickest nudge is a reason to come in this week: an offer with an end date on it, mentioned when you serve somebody and on the poster by your counter.",
                ],
                action: d.has_offer
                    ? { label: "Open your dashboard", url: dashboard }
                    : { label: "Create an offer", url: absoluteUrl(`/business/${due.business_id}/offers/new`) },
                ...tipsFooter(optOutToken),
            });

            return { to, subject: `People are finding ${name}`, html, text, headers: unsubscribeHeaders(optOutToken) };
        }

        const { html, text } = brandedEmail({
            eyebrow: "Your first customers",
            title: `Getting ${name}'s first customers`,
            paragraphs: [
                "No customers have come through Promotello yet, which is normal in the first couple of weeks.",
                d.has_poster
                    ? "The quickest way to change that is to mention your offer when you serve somebody, and keep your QR poster where people wait or pay, so they can scan it there and then."
                    : "The quickest way to change that is your QR poster. Put it in your window or by the counter, so customers can scan your offer while they're there.",
            ],
            action: d.has_poster
                ? { label: "Open your dashboard", url: dashboard }
                : { label: "Get your poster", url: absoluteUrl(`/business/${due.business_id}/qr`) },
            ...tipsFooter(optOutToken),
        });

        return { to, subject: `Getting ${name}'s first customers`, html, text, headers: unsubscribeHeaders(optOutToken) };
    }

    if (due.kind === "check_in") {
        return personalEmail({
            unsubscribeToken: optOutToken,
            to,
            subject: "Anything I can help with?",
            paragraphs: [
                "Hi,",
                `I'm ${FOUNDER.name}, and I started Promotello. I noticed ${name} isn't quite set up yet, so I wanted to check in.`,
                "Is anything getting in the way? If something's confusing, or Promotello isn't right for you, I'd really like to know. Just reply to this email, I read every one.",
                `If you'd like to pick up where you left off, your dashboard shows what's left: ${dashboard}`,
            ],
        });
    }

    return null;
}

// A plain note from a person rather than a branded email, for the
// check-in. Replies go to the usual reply-to inbox.
function personalEmail({ to, subject, paragraphs, unsubscribeToken }: { to: string; subject: string; paragraphs: string[]; unsubscribeToken?: string }): Email {
    const e = escapeHtml;
    const signature = [FOUNDER.name, FOUNDER.title];
    const settings = optOutUrl(unsubscribeToken);
    const linked = (text: string) => e(text).replace(/(https:\/\/[^\s]+)/g, '<a href="$1" style="color:#FF593F">$1</a>');

    const html = `<!doctype html>
<html><body style="margin:0;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#17233B;font-size:15px;line-height:1.6">
<div style="max-width:520px">
${paragraphs.map((text) => `<p style="margin:0 0 14px">${linked(text)}</p>`).join("\n")}
<p style="margin:0 0 14px">${signature.map(e).join("<br>")}</p>
<p style="margin:24px 0 0;font-size:12px;color:#6b7387">You're getting this because you run a business on Promotello. <a href="${e(settings)}" style="color:#6b7387">Turn off setup tips</a></p>
</div>
${emailCompanyFooter()}
</body></html>`;

    const text = [
        ...paragraphs.flatMap((p) => [p, ""]),
        ...signature,
        "",
        `You're getting this because you run a business on Promotello. Turn off setup tips: ${settings}`,
        "",
        companyDisclosure(),
    ].join("\n");

    return { to, subject, html, text, senderName: FOUNDER.name, headers: unsubscribeHeaders(unsubscribeToken) };
}

async function withPlanAndApproval(claimed: Omit<LifecycleDue, "hasPro" | "approved">[]): Promise<LifecycleDue[]> {
    if (claimed.length === 0) return [];

    const ids = [...new Set(claimed.map((item) => item.business_id))];
    const admin = createAdminClient();
    const [{ data: subscriptions }, { data: businesses }] = await Promise.all([
        admin.from("subscriptions").select("business_id").in("business_id", ids).in("status", PRO_SUBSCRIPTION_STATUSES),
        admin.from("businesses").select("id, approval_status").in("id", ids),
    ]);
    const pro = new Set((subscriptions ?? []).map((row) => row.business_id));
    const approved = new Set((businesses ?? []).filter((row) => row.approval_status === "approved").map((row) => row.id));

    return claimed.map((item) => ({ ...item, hasPro: pro.has(item.business_id), approved: approved.has(item.business_id) }));
}

// Opt-out tokens for a set of addresses, keyed by address. A failure here
// must not stop the emails: they still carry the preferences-page link, so
// the worst case is an opt-out that asks for a login.
async function unsubscribeTokensFor(addresses: string[]) {
    const unique = [...new Set(addresses)];

    if (unique.length === 0) return new Map<string, string>();

    const { data, error } = await createAdminClient().rpc("business_tips_tokens", { target_emails: unique });

    if (error) {
        console.error("Lifecycle emails: could not load unsubscribe tokens", error);
        return new Map<string, string>();
    }

    const rows = (data ?? []) as { email: string; token: string }[];

    return new Map(rows.map((row) => [row.email, row.token]));
}

// Sends whatever is due: every business from the daily job, or one
// business straight after it signs up.
export async function sendLifecycleEmails(onlyBusiness?: string) {
    const { data, error } = await createAdminClient().rpc("claim_business_lifecycle_emails", {
        only_business: onlyBusiness ?? null,
    });

    if (error) {
        console.error("Lifecycle emails: failed to claim", error);
        return { due: 0, sent: 0 };
    }

    const claimed = (data ?? []) as Omit<LifecycleDue, "hasPro" | "approved">[];
    const due = await withPlanAndApproval(claimed);
    const foundingPlacesLeft = due.some((item) => item.kind === "founding_places")
        ? await countFoundingMembers().then((taken) => FOUNDING_MEMBER_LIMIT - taken).catch(() => null)
        : null;
    // One opt-out token per recipient, created on demand, so the header and
    // the footer link both work without anyone signing in.
    const tokens = await unsubscribeTokensFor(due.flatMap((item) => item.emails));

    const emails = due.flatMap((item) =>
        item.emails
            .map((to) => lifecycleEmail(item, to, { foundingPlacesLeft, unsubscribeToken: tokens.get(to) }))
            .filter((email): email is Email => email !== null),
    );
    const { sent, failedTo } = await sendEmails(emails);

    if (failedTo.length > 0) {
        const lost = new Set(failedTo);
        const stuck = due.filter((item) => item.emails.some((to) => lost.has(to)));

        for (const item of stuck) {
            await releaseClaims("Lifecycle emails", () =>
                createAdminClient()
                    .from("business_lifecycle_sends")
                    .delete()
                    .eq("business_id", item.business_id)
                    .eq("kind", item.kind),
            );
        }
    }

    return { due: due.length, sent };
}

// Straight after a business starts its free trial (from the Stripe
// webhook): what it's unlocked and the first thing to set up.
export function trialStartedEmail(
    business: { id: string; name: string },
    { tier, trialEnd, hasLoyalty, hasCard = true }: {
        tier: "pro" | "growth";
        trialEnd: string;
        hasLoyalty: boolean;
        // Started without one, which is the usual way now. "Cancel any
        // time" is the wrong thing to tell somebody who has nothing to
        // cancel — it invents a job for them and implies a charge.
        hasCard?: boolean;
    },
    to: string,
): Email {
    const plan = tier === "growth" ? "Growth" : "Pro";
    const base = `/business/${business.id}`;
    const unlocked = [
        "Unlocked: a digital loyalty card, as many live offers as you like, Google review requests after each visit, and an email to your followers whenever a new offer of yours goes live.",
        ...(tier === "growth"
            ? ["With Growth you also get welcome, birthday and win-back emails that run themselves, quiet-hours offers and a monthly value report."]
            : []),
    ];

    const { html, text } = brandedEmail({
        eyebrow: "Your free trial",
        title: `${business.name} is on ${plan}`,
        paragraphs: [
            hasCard
                ? `Your ${plan} trial runs until ${formatDate(trialEnd)}. You won't be charged before then, and you can cancel any time from Billing.`
                : `Your ${plan} trial runs until ${formatDate(trialEnd)}. There's no card on it and nothing to cancel: on that date it stops unless you decide to keep it.`,
            ...unlocked,
            hasLoyalty
                ? "Your loyalty card is ready. Put your QR poster by the counter so customers can join, and add a stamp each visit by scanning their phone with yours."
                : "Start with your loyalty card: choose a reward, like a free coffee after nine, then put your QR poster by the counter so customers can join.",
        ],
        action: hasLoyalty
            ? { label: "Get your poster", url: absoluteUrl(`${base}/qr`) }
            : { label: "Set up your loyalty card", url: absoluteUrl(`${base}/loyalty`) },
        footer: `You're getting this because ${business.name} started a Promotello free trial.`,
    });

    return { to, subject: `Your ${plan} trial has started`, html, text };
}

export async function sendTrialStartedEmail(stripeSubscriptionId: string) {
    const admin = createAdminClient();
    const { data: subscription } = await admin
        .from("subscriptions")
        .select("status, tier, trial_end, has_payment_method, businesses ( id, name )")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .maybeSingle();

    const business = Array.isArray(subscription?.businesses) ? subscription.businesses[0] : subscription?.businesses;

    if (!subscription || !business || subscription.status !== "trialing" || !subscription.trial_end) {
        return { sent: 0 };
    }

    const [{ data: emails }, { count: loyaltyPrograms }] = await Promise.all([
        admin.rpc("business_manager_emails", { requested_business_id: business.id }),
        admin.from("loyalty_programs").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
    ]);
    const details = {
        tier: subscription.tier === "growth" ? "growth" as const : "pro" as const,
        trialEnd: subscription.trial_end,
        hasLoyalty: (loyaltyPrograms ?? 0) > 0,
        hasCard: subscription.has_payment_method !== false,
    };

    return sendEmails(((emails ?? []) as string[]).map((to) => trialStartedEmail(business, details, to)));
}

// A day after someone signs up as a business without adding one (see
// claim_business_signup_reminders). Sent once.
export function businessSignupReminderEmail({ to, fullName }: { to: string; fullName: string | null }): Email {
    const firstName = fullName?.trim().split(/\s+/)[0] || null;
    const { html, text } = brandedEmail({
        eyebrow: "Finish setting up",
        title: firstName ? `${firstName}, your business is one step away` : "Your business is one step away",
        paragraphs: [
            "You've created your Promotello account, but haven't added your business yet. It takes a couple of minutes: your business name, what you do and where you are.",
            "Then you can post your first offer, get a QR poster for your counter and start bringing in new customers. The Free plan costs nothing, for as long as you like.",
            `If you'd like a hand, just reply to this email.`,
        ],
        action: { label: "Add my business", url: absoluteUrl("/business/setup/new") },
        footer: "You're getting this because you signed up for a Promotello business account. This is the only reminder we'll send.",
    });

    return { to, subject: "Add your business to Promotello", html, text };
}

export async function sendBusinessSignupReminders() {
    const { data, error } = await createAdminClient().rpc("claim_business_signup_reminders");

    if (error) {
        throw error;
    }

    const due = (data ?? []) as { user_id: string; email: string; full_name: string | null }[];
    const result = await sendEmails(due.map((row) => businessSignupReminderEmail({ to: row.email, fullName: row.full_name })));

    if (result.failedTo.length > 0) {
        const lost = new Set(result.failedTo);
        const ids = due.filter((row) => lost.has(row.email)).map((row) => row.user_id);

        await releaseClaims("Signup reminders", () =>
            createAdminClient().from("business_signup_reminders").delete().in("user_id", ids),
        );
    }

    return result;
}
