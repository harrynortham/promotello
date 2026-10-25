import { escapeHtml, sendEmails, type Email } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

type Change = { current: number; previous: number };

type Report = {
    business_id: string;
    business_name: string;
    emails: string[];
    figures: {
        followers: number;
        metrics: Partial<
            Record<"views" | "qr_scans" | "claims" | "visits" | "loyalty_rewards" | "new_followers" | "review_clicks", Change>
        >;
    };
};

const rows: { key: keyof Report["figures"]["metrics"]; label: string }[] = [
    { key: "visits", label: "Customer visits (vouchers used and loyalty stamps)" },
    { key: "claims", label: "Vouchers claimed" },
    { key: "views", label: "Views of your page and offers" },
    { key: "qr_scans", label: "QR poster scans" },
    { key: "new_followers", label: "New followers" },
    { key: "loyalty_rewards", label: "Loyalty rewards earned" },
    { key: "review_clicks", label: "Google review clicks" },
];

function changeText({ current, previous }: Change) {
    if (previous === 0) return current > 0 ? "new" : "–";
    const percent = Math.round(((current - previous) / previous) * 100);
    return `${percent > 0 ? "▲" : percent < 0 ? "▼" : ""} ${Math.abs(percent)}%`;
}

export function monthlyReportEmail(report: Report, to: string, monthName: string): Email {
    const e = escapeHtml;
    const empty: Change = { current: 0, previous: 0 };
    const visits = report.figures.metrics.visits ?? empty;
    const analyticsUrl = absoluteUrl(`/business/${report.business_id}/analytics`);

    const tableRows = rows
        .map(({ key, label }) => {
            const metric = report.figures.metrics[key] ?? empty;
            return `<tr><td style="padding:10px 0;border-bottom:1px solid #f0ebe4;font-size:14px;color:#45506a">${e(label)}</td><td style="padding:10px 0;border-bottom:1px solid #f0ebe4;font-size:16px;font-weight:600;text-align:right">${metric.current}</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #f0ebe4;font-size:12px;color:#6b7387;text-align:right;white-space:nowrap">${e(changeText(metric))}</td></tr>`;
        })
        .join("");

    const headline = visits.current > 0
        ? `${visits.current} customer ${visits.current === 1 ? "visit" : "visits"} came through Promotello in ${monthName}.`
        : `Here's how ${monthName} went on Promotello.`;

    const html = `<!doctype html>
<html><body style="margin:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#17233B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e8e2da">
<tr><td style="padding:28px">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#C8371D">${e(report.business_name)} · ${e(monthName)}</p>
<h1 style="margin:12px 0 0;font-size:24px;line-height:1.3">${e(headline)}</h1>
<p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#45506a">You now have ${report.figures.followers} ${report.figures.followers === 1 ? "follower" : "followers"}. Changes are against the month before.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">${tableRows}</table>
<a href="${analyticsUrl}" style="display:inline-block;margin-top:24px;background:#C8371D;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">See full analytics</a>
</td></tr></table>
<p style="max-width:560px;margin:20px auto 0;font-size:12px;line-height:1.6;color:#6b7387">Your monthly report from Promotello, sent to business owners on Growth.</p>
</td></tr></table></body></html>`;

    const text = [
        `${report.business_name} · ${monthName}`,
        headline,
        "",
        ...rows.map(({ key, label }) => {
            const metric = report.figures.metrics[key] ?? empty;
            return `${label}: ${metric.current} (${changeText(metric)})`;
        }),
        "",
        `Followers: ${report.figures.followers}`,
        `Full analytics: ${analyticsUrl}`,
    ].join("\n");

    return { to, subject: `Your ${monthName} on Promotello`, html, text };
}

// Sends last month's reports. Each business is reported once per month, so
// running it again the same month does nothing.
export async function sendMonthlyReports(today = new Date()) {
    const lastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const monthName = lastMonth.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });

    const { data, error } = await createAdminClient().rpc("claim_monthly_reports", {
        report_month: lastMonth.toISOString().slice(0, 10),
    });

    if (error) {
        console.error("Monthly reports: failed to claim", error);
        return { businesses: 0, sent: 0 };
    }

    const reports = (data ?? []) as Report[];
    const { sent } = await sendEmails(
        reports.flatMap((report) => report.emails.map((to) => monthlyReportEmail(report, to, monthName))),
    );

    return { businesses: reports.length, sent };
}
