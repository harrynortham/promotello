import { PRO_SUBSCRIPTION_STATUSES, TRIAL_DAYS } from "@/lib/billing";
import { brandedEmail, sendEmails, type Email } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

// Emails that guide a new business through setup and its free trial, in
// place of an in-person setup visit. The database decides what's due
// (claim_business_lifecycle_emails) and records each send, so running
// this twice never emails anyone twice.

export type LifecycleKind = "welcome" | "setup_nudge_1" | "setup_nudge_2" | "trial_ending";

export type LifecycleDue = {
    business_id: string;
    business_name: string;
    kind: LifecycleKind;
    emails: string[];
    details: {
        has_offer: boolean;
        has_loyalty: boolean;
        has_poster: boolean;
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

type Step = { key: "offer" | "loyalty" | "poster"; label: string; why: string; path: string; action: string };

// Loyalty cards are part of Pro, so a free business is sent to start its
// trial rather than to a page it can't use.
function setupSteps(businessId: string, hasPro: boolean): Step[] {
    const base = `/business/${businessId}`;

    return [
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
                why: "A digital stamp card turns first-time visitors into regulars. Customers join by scanning, and you stamp them at the till.",
                path: `${base}/loyalty`,
                action: "Set up a loyalty card",
            }
            : {
                key: "loyalty",
                label: "Start a loyalty card with a free Pro trial",
                why: `A digital stamp card turns first-time visitors into regulars. Customers join by scanning, and you stamp them at the till. Loyalty cards are part of Pro, which is free for ${TRIAL_DAYS} days: we ask for a card but don't charge it until the trial ends, and you can cancel before then.`,
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

function missingSteps(due: LifecycleDue) {
    const done = {
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

const tipsFooter = {
    footer: "You're getting this because you run a business on Promotello. We'll only send a few setup tips.",
    footerLinks: [{ label: "Turn off setup tips", url: absoluteUrl("/account/notifications") }],
};

export function lifecycleEmail(due: LifecycleDue, to: string): Email | null {
    const name = due.business_name;
    const dashboard = absoluteUrl(`/business/${due.business_id}`);
    const missing = missingSteps(due);

    if (due.kind === "welcome") {
        const steps = setupSteps(due.business_id, due.hasPro);
        const { html, text } = brandedEmail({
            eyebrow: "Welcome to Promotello",
            title: `${name} is on Promotello`,
            paragraphs: [
                "Thanks for signing up. Three things get you ready to turn first-time visitors into regulars, and together they take about 15 minutes:",
                ...steps.map((step, index) => `${index + 1}. ${step.label}. ${step.why}`),
                "Your dashboard shows what's left to do, with a checklist you can work through at your own pace.",
                ...(due.approved
                    ? []
                    : ["We check every new business before it appears to customers. You can set everything up in the meantime, and we'll email you as soon as you're live."]),
            ],
            action: { label: "Open your dashboard", url: dashboard },
            footer: "You're getting this because you just added your business to Promotello.",
        });

        return { to, subject: `Welcome to Promotello: getting ${name} set up`, html, text };
    }

    if (due.kind === "setup_nudge_1" || due.kind === "setup_nudge_2") {
        const next = missing[0];

        if (!next) return null;

        const others = missing.slice(1).map((step) => step.label.toLowerCase());
        const { html, text } = brandedEmail({
            eyebrow: due.kind === "setup_nudge_1" ? "Your next step" : "Almost there",
            title: `${next.label} for ${name}`,
            paragraphs: [
                next.why,
                others.length > 0
                    ? `After that: ${others.join(" and ")}. Then you're ready for customers.`
                    : "That's the last step, and then you're ready for customers.",
            ],
            action: { label: next.action, url: absoluteUrl(next.path) },
            ...tipsFooter,
        });

        return { to, subject: `${next.label} for ${name}`, html, text };
    }

    if (due.kind === "trial_ending" && due.details.trial_end) {
        const d = due.details;
        const trialEnd = formatDate(due.details.trial_end);
        const results = [
            d.visits > 0 && plural(d.visits, "customer visit", "customer visits"),
            d.loyalty_members > 0 && plural(d.loyalty_members, "loyalty card member", "loyalty card members"),
            d.followers > 0 && plural(d.followers, "follower", "followers"),
            d.claims > 0 && plural(d.claims, "voucher claimed", "vouchers claimed"),
            d.qr_scans > 0 && plural(d.qr_scans, "poster scan", "poster scans"),
            d.views > 0 && plural(d.views, "page view", "page views"),
        ].filter(Boolean) as string[];

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

        return { to, subject: `Your Promotello trial ends on ${trialEnd}`, html, text };
    }

    return null;
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
    const emails = due.flatMap((item) =>
        item.emails.map((to) => lifecycleEmail(item, to)).filter((email): email is Email => email !== null),
    );
    const { sent } = await sendEmails(emails);

    return { due: due.length, sent };
}
