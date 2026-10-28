import { brandedEmail, emailCompanyFooter, emailLogoRow, escapeHtml, sendEmails, type Email } from "@/lib/email";
import { companyDisclosure } from "@/lib/legal";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

// Emails to a business's owners and admins about their offers, chosen in
// Settings → Notifications: a daily summary (off by default) and alerts
// when a limited offer runs low or runs out (on by default). The database
// decides what's due and records each send, so nothing is sent twice.

type DailySummary = {
    business_id: string;
    business_name: string;
    emails: string[];
    offers: { title: string; claimed: number; used: number }[];
    claimed: number;
    used: number;
};

type StockAlert = {
    kind: "offer_fully_claimed" | "low_inventory";
    business_id: string;
    business_name: string;
    offer_title: string;
    remaining: number;
    max_redemptions: number;
    emails: string[];
};

function plural(count: number, one: string, many: string) {
    return `${count} ${count === 1 ? one : many}`;
}

const settingsFooter = (businessId: string) => ({
    footer: "You're getting this because you manage this business on Promotello.",
    footerLinks: [{ label: "Notification settings", url: absoluteUrl(`/business/${businessId}/settings/notifications`) }],
});

export function dailySummaryEmail(summary: DailySummary, to: string, dayName: string): Email {
    const e = escapeHtml;
    const redemptionsUrl = absoluteUrl(`/business/${summary.business_id}/redemptions`);
    const settingsUrl = absoluteUrl(`/business/${summary.business_id}/settings/notifications`);
    const headline = `${plural(summary.claimed, "voucher", "vouchers")} claimed and ${summary.used} used ${dayName}.`;

    const rows = summary.offers
        .map(
            (offer) =>
                `<tr><td style="padding:10px 0;border-bottom:1px solid #f0ebe4;font-size:14px;color:#45506a">${e(offer.title)}</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #f0ebe4;font-size:15px;font-weight:600;text-align:right;white-space:nowrap">${offer.claimed}</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #f0ebe4;font-size:15px;font-weight:600;text-align:right;white-space:nowrap">${offer.used}</td></tr>`,
        )
        .join("");

    const html = `<!doctype html>
<html><body style="margin:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#17233B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e8e2da">
${emailLogoRow()}
<tr><td style="padding:20px 28px 28px">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#FF593F">${e(summary.business_name)} · Daily summary</p>
<h1 style="margin:12px 0 0;font-size:24px;line-height:1.3">${e(headline)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">
<tr><td style="padding:0 0 8px;font-size:12px;color:#6b7387">Offer</td><td style="padding:0 0 8px 12px;font-size:12px;color:#6b7387;text-align:right">Claimed</td><td style="padding:0 0 8px 12px;font-size:12px;color:#6b7387;text-align:right">Used</td></tr>
${rows}
</table>
<a href="${redemptionsUrl}" style="display:inline-block;margin-top:24px;background:#FF593F;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">See redemptions</a>
</td></tr></table>
<p style="max-width:560px;margin:20px auto 0;font-size:12px;line-height:1.6;color:#6b7387">You're getting this because the daily summary is on for ${e(summary.business_name)}.<br><a href="${settingsUrl}" style="color:#6b7387">Notification settings</a></p>
${emailCompanyFooter(560)}
</td></tr></table></body></html>`;

    const text = [
        `${summary.business_name} · Daily summary`,
        headline,
        "",
        ...summary.offers.map((offer) => `${offer.title}: ${offer.claimed} claimed, ${offer.used} used`),
        "",
        `See redemptions: ${redemptionsUrl}`,
        `Notification settings: ${settingsUrl}`,
        "",
        companyDisclosure(),
    ].join("\n");

    return { to, subject: `${summary.business_name}: ${headline.replace(/\.$/, "")}`, html, text };
}

export function stockAlertEmail(alert: StockAlert, to: string): Email {
    const offersUrl = absoluteUrl(`/business/${alert.business_id}/offers`);
    const soldOut = alert.kind === "offer_fully_claimed";

    const { html, text } = brandedEmail({
        eyebrow: `${alert.business_name} · ${soldOut ? "Offer fully claimed" : "Running low"}`,
        title: soldOut
            ? `All ${alert.max_redemptions} of "${alert.offer_title}" have been claimed`
            : `Only ${plural(alert.remaining, "claim", "claims")} left on "${alert.offer_title}"`,
        paragraphs: soldOut
            ? [
                "Nobody else can claim it now. Customers who already have a voucher can still use it until it expires.",
                "If it's going well, raise the limit or start a new offer to keep the momentum going.",
            ]
            : [
                `${alert.max_redemptions - alert.remaining} of ${alert.max_redemptions} have been claimed.`,
                "Raise the limit if you'd like more people to have it, or let it run out.",
            ],
        action: { label: "Manage offers", url: offersUrl },
        ...settingsFooter(alert.business_id),
    });

    return {
        to,
        subject: soldOut ? `Fully claimed: ${alert.offer_title}` : `Running low: ${alert.offer_title}`,
        html,
        text,
    };
}

// Daily: yesterday's summary (UK date) for businesses that turned it on.
export async function sendDailySummaries(today = new Date()) {
    const yesterday = new Date(today.getTime() - 86_400_000);
    const ukDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(yesterday);

    const { data, error } = await createAdminClient().rpc("claim_daily_summaries", { summary_date: ukDate });

    if (error) {
        console.error("Daily summaries: failed to claim", error);
        return { businesses: 0, sent: 0 };
    }

    const summaries = (data ?? []) as DailySummary[];
    const { sent } = await sendEmails(summaries.flatMap((summary) => summary.emails.map((to) => dailySummaryEmail(summary, to, "yesterday"))));

    return { businesses: summaries.length, sent };
}

// After a claim: tells the business if the offer has run low or run out.
export async function sendOfferStockAlert(offerId: string) {
    const { data, error } = await createAdminClient().rpc("claim_offer_stock_alert", { requested_offer_id: offerId });

    if (error) {
        console.error("Offer stock alert: failed to claim", error);
        return { sent: 0 };
    }

    const alerts = (data ?? []) as StockAlert[];
    return sendEmails(alerts.flatMap((alert) => alert.emails.map((to) => stockAlertEmail(alert, to))));
}
