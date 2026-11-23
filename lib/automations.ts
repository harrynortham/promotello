import { brandedEmail, sendEmails, type Email } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";
import { voucherIssued } from "@/lib/notifications";
import { notifyUsers } from "@/lib/notify";

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

export type IssuedVoucher = {
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
    terms: string | null;
    image_url: string | null;
    // Looked up beside the vouchers rather than returned by the RPC:
    // adding a column there means dropping and recreating a security
    // definer function, which is worth avoiding for a logo.
    business_logo_url?: string | null;
};

// No exclamation marks, the same as every other message we send
// (lib/notifications.ts). These three were the only ones in lib, and a
// welcome or a birthday is warm because of what it carries — a reward
// with their name on it — not because of the punctuation.
const copy: Record<AutomationKind, (v: IssuedVoucher) => { subject: string; title: string; intro: string }> = {
    welcome: (v) => ({
        subject: `Thanks for following ${v.business_name}`,
        title: `Welcome${v.first_name ? `, ${v.first_name}` : ""}`,
        intro: `Thanks for following ${v.business_name}. Here's a little something to say hello.`,
    }),
    birthday: (v) => ({
        subject: `Happy birthday from ${v.business_name}`,
        title: `Happy birthday${v.first_name ? `, ${v.first_name}` : ""}`,
        intro: `Everyone at ${v.business_name} hopes you have a lovely day. Here's a treat from us.`,
    }),
    winback: (v) => ({
        subject: `We've missed you at ${v.business_name}`,
        title: "It's been a while",
        intro: `We haven't seen you at ${v.business_name} for a bit, so here's a reason to pop back in.`,
    }),
};

export function automationEmail(voucher: IssuedVoucher): Email {
    const { subject, title, intro } = copy[voucher.kind](voucher);
    const until = new Date(voucher.expires_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/London",
    });
    const unsubscribeUrl = absoluteUrl(`/unsubscribe/${voucher.unsubscribe_token}`);

    const { html, text } = brandedEmail({
        // Whose gift this is, above everything: the reader followed them,
        // not us. emailBusinessRow() stands initials in where there is no
        // logo, so this is safe for a business that never uploaded one.
        business: { name: voucher.business_name, logoUrl: voucher.business_logo_url },
        eyebrow: voucher.business_name,
        title,
        paragraphs: [intro, `Your reward: ${voucher.reward}.`, `Use it by ${until}.`],
        // Their own photograph, where an offer email shows the offer's.
        // It decorates: the email reads the same with images turned off.
        ...(voucher.image_url
            ? { picture: { url: voucher.image_url, alt: voucher.reward } }
            : {}),
        // Quieter than a paragraph, because terms are read when a
        // question comes up at the counter rather than straight through.
        ...(voucher.terms ? { details: [{ label: "Terms", text: voucher.terms }] } : {}),
        // The same card the offer page shows, and the same card the
        // voucher for a claimed offer arrives in: one thing to hold up at
        // the till, whichever way the voucher was earned.
        voucher: { code: voucher.code, qrUrl: absoluteUrl(`/redeem/${voucher.code}/qr`) },
        // The reward itself, not the pile of every voucher they hold. My
        // vouchers is the back link on the page this opens.
        action: {
            label: "Open this voucher",
            url: absoluteUrl(`/dashboard/redemptions/${voucher.voucher_id}`),
        },
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

// The logo for the row at the top of the email. One query for every
// business in the batch rather than a lookup each, and a failure here
// costs initials rather than the email.
async function attachLogos(vouchers: IssuedVoucher[]) {
    if (vouchers.length === 0) return;

    const { data, error } = await createAdminClient()
        .from("businesses")
        .select("id, logo_url")
        .in("id", [...new Set(vouchers.map((voucher) => voucher.business_id))]);

    if (error) {
        console.error("Automations: could not read business logos", error);
        return;
    }

    const logos = new Map((data ?? []).map((row) => [row.id, row.logo_url]));

    for (const voucher of vouchers) {
        voucher.business_logo_url = logos.get(voucher.business_id) ?? null;
    }
}

async function notifyAboutVouchers(vouchers: IssuedVoucher[]) {
    if (vouchers.length === 0) return;

    const { data: rows } = await createAdminClient()
        .from("reward_vouchers")
        .select("id, user_id")
        .in("id", vouchers.map((voucher) => voucher.voucher_id));

    const owner = new Map((rows ?? []).map((row) => [row.id, row.user_id]));

    for (const voucher of vouchers) {
        const userId = owner.get(voucher.voucher_id);

        if (!userId) continue;

        await notifyUsers(
            [userId],
            voucherIssued({
                id: voucher.voucher_id,
                reward: voucher.reward,
                businessName: voucher.business_name,
            }),
        );
    }
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

    await attachLogos(vouchers);

    // Beside the email, and before it: the voucher is already theirs,
    // and a failed send must not be the reason nobody hears about it.
    // The rows carry no user id, so the wallet is asked who they belong
    // to — one query for the lot rather than a lookup each.
    await notifyAboutVouchers(vouchers);

    const { sent, sentTo } = await sendEmails(vouchers.map(automationEmail));

    // The voucher is the customer's reward, so a failed send must never
    // delete it the way the other scheduled emails release their claim.
    // Instead only the ones that got through are stamped; the rest come
    // back on the next run until they expire.
    const delivered = vouchers.filter((voucher) => sentTo.includes(voucher.email));

    if (delivered.length > 0) {
        const { error: stampError } = await createAdminClient()
            .from("reward_vouchers")
            .update({ emailed_at: new Date().toISOString() })
            .in("id", delivered.map((voucher) => voucher.voucher_id));

        if (stampError) {
            // Not stamping means a second email, which is better than a
            // reward nobody was told about, but say so.
            console.error("Automations: could not mark vouchers as emailed", stampError);
        }
    }

    return { issued: vouchers.length, sent };
}
