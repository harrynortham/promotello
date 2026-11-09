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
        has_cover: boolean;
        trial_end: string | null;
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

type Step = { key: "offer" | "loyalty" | "poster" | "cover"; label: string; why: string; path: string; action: string };

// Loyalty cards are part of Pro, so a free business is sent to start its
// trial rather than to a page it can't use.
function setupSteps(businessId: string, hasPro: boolean): Step[] {
    const base = `/business/${businessId}`;

    return [
        {
            key: "cover",
            label: "Add a cover photo",
            why: "The picture across the top of your page, and the one customers see on your card in the directory. It is the first thing they look at.",
            path: `${base}/cover`,
            action: "Add a cover photo",
        },
        {
            key: "offer",
            label: "Post your first offer",
            why: "An offer gives new customers a reason to visit, and it shows on your page and in the Promotello directory.",
            path: `${base}/offers/new`,
            action: "Create an offer",
        },
        hasPro
            ? {
                key: "loyalty",
                label: "Set up your loyalty card",
                why: "A digital stamp card turns first-time visitors into regulars. Customers join by scanning your poster or from your page in the directory, so people who have never been in can join too, and you stamp them at the till.",
                path: `${base}/loyalty`,
                action: "Set up a loyalty card",
            }
            : {
                key: "loyalty",
                label: "Start a loyalty card with a free Pro trial",
                why: `A digital stamp card turns first-time visitors into regulars, and because it sits on your page in the directory as well as your poster, people who have never been in can join it too. Loyalty cards are part of Pro, free for ${TRIAL_DAYS} days, with the terms on the Billing page before you start.`,
                path: `${base}/billing`,
                action: `Try Pro free for ${TRIAL_DAYS} days`,
            },
        {
            key: "poster",
            label: "Print your QR poster",
            why: "A poster in your window or by the till is how customers find your offers and loyalty card. It takes a minute to print.",
            path: `${base}/qr`,
            action: "Get your poster",
        },
    ];
}

// "Three things", not "3 things": these are sentences, and the list is
// never long enough to need a numeral.
function countInWords(count: number) {
    const words = ["No things", "One thing", "Two things", "Three things", "Four things", "Five things"];

    return words[count] ?? `${count} things`;
}

function missingSteps(due: LifecycleDue) {
    const done = {
        cover: due.details.has_cover,
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
// three weeks, so they say the same four things in different words rather
// than the same sentence four times: how long it's free, that a card is
// taken at the start, that nothing is charged until it ends, and that
// cancelling before then costs nothing. Shortening any of them to "free
// for ${TRIAL_DAYS} days" would drop the card, which is the part people
// mind finding out about later.
export const trialTerms = {
    pitch: `Pro is free for ${TRIAL_DAYS} days. We ask for a card when you start, but don't charge it until the trial ends, and you can cancel any time before then.`,
    founding: `A place is held the moment you start the trial. That takes a card, though nothing leaves it for ${TRIAL_DAYS} days, and cancelling before then costs nothing.`,
    adds: `The first ${TRIAL_DAYS} days are free. Starting takes a card, the first charge is the day the trial ends, and you can stop before it in Billing.`,
    results: `Trying it is free for ${TRIAL_DAYS} days — a card to begin, no charge until the trial is up, and cancelling before then from your Billing page.`,
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
        const steps = setupSteps(due.business_id, due.hasPro);
        const { html, text } = brandedEmail({
            eyebrow: "Welcome to Promotello",
            title: `${name} is on Promotello`,
            paragraphs: [
                `Thanks for signing up. ${countInWords(steps.length)} get you ready to turn first-time visitors into regulars, and together they take about 15 minutes:`,
                ...steps.map((step, index) => `${index + 1}. ${step.label}. ${step.why}`),
                "Your dashboard shows what's left to do, with a checklist you can work through at your own pace.",
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
        const title = `${counted} left before customers can find ${name}`;
        const list = remaining.length === 2
            ? remaining.join(" and ")
            : `${remaining.slice(0, -1).join(", ")} and ${remaining[remaining.length - 1]}`;

        const { html, text } = brandedEmail({
            eyebrow: "Still to do",
            title,
            paragraphs: [
                remaining.length === 1
                    ? `Your page is set up apart from one thing: ${remaining[0]}.`
                    : `Your page is set up, but it stays quiet until the rest is done: ${list}.`,
                "Each one takes a few minutes, and you can stop after any of them. New offers are read by our team before they appear, usually the same day.",
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

        const { html, text } = brandedEmail({
            eyebrow: "Your free trial",
            title: `Your trial ends on ${trialEnd}`,
            paragraphs: [
                results.length > 0
                    ? `Since ${formatDate(d.since)}, ${name} has had ${results.join(", ")} through Promotello.`
                    : `${name} hasn't had customers through Promotello yet. ${missing.length > 0 ? `${missing[0].label} to get started: ${missing[0].why}` : "Tell customers about your loyalty card at the till to get the first sign-ups."}`,
                "Your plan carries on automatically when the trial ends, so you don't need to do anything. You can change or cancel your plan in Billing before then.",
            ],
            action: { label: "Review your plan", url: absoluteUrl(`/business/${due.business_id}/billing`) },
            footer: "You're getting this because your business is on a Promotello free trial.",
        });

        return { to, subject: `Your Promotello trial ends on ${trialEnd}`, html, text, headers: unsubscribeHeaders(optOutToken) };
    }

    const billing = absoluteUrl(`/business/${due.business_id}/billing`);
    const tryPro = { label: `Try Pro free for ${TRIAL_DAYS} days`, url: billing };

    if (due.kind === "loyalty_pitch") {
        const { html, text } = brandedEmail({
            eyebrow: "Loyalty cards",
            title: `Turn ${name}'s first-time visitors into regulars`,
            paragraphs: [
                "Paper stamp cards get lost, forgotten and put through the wash. A Promotello loyalty card lives on your customers' phones, so they always have it with them.",
                "You choose the reward, like a free coffee after nine. Customers join by scanning your QR poster, and you or your staff stamp their card at the till. When they reach the reward, they show their card and you hand it over.",
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
        const results = resultsList(d);

        if (results.length > 0) {
            const { html, text } = brandedEmail({
                eyebrow: "Your first two weeks",
                title: `How ${name} is doing on Promotello`,
                paragraphs: [
                    `Since ${formatDate(d.since)}, ${name} has had ${results.join(", ")} through Promotello.`,
                    `Pro helps bring those customers back: they join your loyalty card and return for their next stamp, and your followers hear about every new offer. It's ${plans.pro_monthly.price} a month.`,
                    trialTerms.results,
                ],
                action: tryPro,
                ...tipsFooter(optOutToken),
            });

            return { to, subject: `${name}'s first two weeks on Promotello`, html, text, headers: unsubscribeHeaders(optOutToken) };
        }

        const { html, text } = brandedEmail({
            eyebrow: "Your first customers",
            title: `Getting ${name}'s first customers`,
            paragraphs: [
                "No customers have come through Promotello yet, which is normal in the first couple of weeks.",
                d.has_poster
                    ? "The quickest way to change that is to mention your offer at the till and keep your QR poster where people wait or pay, so they can scan it there and then."
                    : "The quickest way to change that is your QR poster. Put it in your window or by the till, so customers can scan your offer while they're there.",
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
    { tier, trialEnd, hasLoyalty }: { tier: "pro" | "growth"; trialEnd: string; hasLoyalty: boolean },
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
            `Your ${plan} trial runs until ${formatDate(trialEnd)}. You won't be charged before then, and you can cancel any time from Billing.`,
            ...unlocked,
            hasLoyalty
                ? "Your loyalty card is ready. Put your QR poster by the till so customers can join, and stamp their card each visit."
                : "Start with your loyalty card: choose a reward, like a free coffee after nine, then put your QR poster by the till so customers can join.",
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
        .select("status, tier, trial_end, businesses ( id, name )")
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
        action: { label: "Add my business", url: absoluteUrl("/onboarding") },
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
