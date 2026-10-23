import { brandedEmail, sendEmails, type Email } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

export type AutomationKind = "welcome" | "birthday" | "winback";

export const automationDetails: Record<
    AutomationKind,
    { title: string; description: string; defaultReward: string }
> = {
    welcome: {
        title: "Welcome new followers",
        description: "When someone follows you, they get a thank-you reward to bring them in.",
        defaultReward: "10% off your first visit",
    },
    birthday: {
        title: "Birthday treat",
        description: "Followers who've added their birthday get a treat from you on the day.",
        defaultReward: "A free slice of cake on us",
    },
    winback: {
        title: "Win back lapsed customers",
        description: "Customers who haven't visited for a while get a nudge to come back.",
        defaultReward: "A free coffee when you pop back in",
    },
};

type IssuedVoucher = {
    voucher_id: string;
    kind: AutomationKind;
    reward: string;
    code: string;
    expires_at: string;
    business_id: string;
    business_name: string;
    email: string;
    first_name: string | null;
    unsubscribe_token: string;
};

const copy: Record<AutomationKind, (v: IssuedVoucher) => { subject: string; title: string; intro: string }> = {
    welcome: (v) => ({
        subject: `Thanks for following ${v.business_name}`,
        title: `Welcome${v.first_name ? `, ${v.first_name}` : ""}!`,
        intro: `Thanks for following ${v.business_name}. Here's a little something to say hello.`,
    }),
    birthday: (v) => ({
        subject: `Happy birthday from ${v.business_name}`,
        title: `Happy birthday${v.first_name ? `, ${v.first_name}` : ""}!`,
        intro: `Everyone at ${v.business_name} hopes you have a lovely day. Here's a treat from us.`,
    }),
    winback: (v) => ({
        subject: `We've missed you at ${v.business_name}`,
        title: "It's been a while!",
        intro: `We haven't seen you at ${v.business_name} for a bit, so here's a reason to pop back in.`,
    }),
};

function automationEmail(voucher: IssuedVoucher): Email {
    const { subject, title, intro } = copy[voucher.kind](voucher);
    const until = new Date(voucher.expires_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/London",
    });
    const unsubscribeUrl = absoluteUrl(`/unsubscribe/${voucher.unsubscribe_token}`);

    const { html, text } = brandedEmail({
        eyebrow: voucher.business_name,
        title,
        paragraphs: [
            intro,
            `Your reward: ${voucher.reward}.`,
            `Show code ${voucher.code} at the till, or open My vouchers so staff can scan it. Use it by ${until}.`,
        ],
        action: { label: "Open my vouchers", url: absoluteUrl("/dashboard/redemptions") },
        footer: `You're getting this because you follow ${voucher.business_name} on Promotello.`,
        footerLinks: [
            { label: `Unsubscribe from ${voucher.business_name}`, url: unsubscribeUrl },
            { label: "Email settings", url: absoluteUrl("/account/notifications") },
        ],
    });

    return {
        to: voucher.email,
        subject,
        html,
        text,
        senderName: voucher.business_name,
        headers: {
            "List-Unsubscribe": `<${absoluteUrl(`/api/unsubscribe/${voucher.unsubscribe_token}`)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    };
}

// Issues any due automation vouchers and emails them. With a business and
// user, only that follower's welcome is checked (right after following);
// with nothing, every automation runs (the daily job).
export async function runAutomations(scope?: { businessId: string; userId: string }) {
    const { data, error } = await createAdminClient().rpc("issue_automation_vouchers", {
        requested_business_id: scope?.businessId ?? null,
        requested_user_id: scope?.userId ?? null,
    });

    if (error) {
        console.error("Automations: failed to issue vouchers", error);
        return { issued: 0, sent: 0 };
    }

    const vouchers = (data ?? []) as IssuedVoucher[];
    const { sent } = await sendEmails(vouchers.map(automationEmail));

    return { issued: vouchers.length, sent };
}
