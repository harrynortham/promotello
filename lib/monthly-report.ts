import { EMAIL_WIDTH, emailShell, escapeHtml, sendEmails, type Email } from "@/lib/email";
import { companyDisclosure } from "@/lib/legal";
import { absoluteUrl } from "@/lib/site";
import { releaseClaims } from "@/lib/email-claims";
import { readRepeatVisits, repeatVisitSentence, type RepeatVisits } from "@/lib/repeat-visits";
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

// How much of a month there is to report.
//
// A business pays for this one, so it reports whatever happened —
// unlike the sales emails, where a page view is not evidence of
// anything. But a table of five zeros under "Here's how October went"
// is not a report, it is a monthly reminder that nothing is working,
// and it arrives from the company being paid for it.
//
// So: a month with visits leads on the visits, a month with interest
// but nobody through the door leads on the interest, and a month with
// nothing at all gets a short note instead of a grid of noughts.
export function monthStrength(report: Report) {
    const at = (key: keyof Report["figures"]["metrics"]) => report.figures.metrics[key]?.current ?? 0;

    if (at("visits") > 0) return "visits" as const;

    if (at("claims") > 0 || at("new_followers") > 0 || at("loyalty_rewards") > 0 || report.figures.followers > 0) {
        return "interest" as const;
    }

    return at("views") > 0 || at("qr_scans") > 0 ? "looking" as const : "nothing" as const;
}

export function monthlyReportEmail(
    report: Report,
    to: string,
    monthName: string,
    // The first-visit numbers, where the business is on Growth and the
    // report loaded. The rest of the email stands without them.
    repeatVisits?: RepeatVisits | null,
): Email {
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

    // The one thing no loyalty app can say, where there is something
    // to say: whose first visit it was, and who came back.
    const firstTimers = repeatVisits && repeatVisits.newCustomers > 0
        ? repeatVisitSentence(repeatVisits)
        : null;

    const strength = monthStrength(report);
    const claims = report.figures.metrics.claims ?? empty;
    const looks = (report.figures.metrics.views ?? empty).current + (report.figures.metrics.qr_scans ?? empty).current;

    const headline = strength === "visits"
        ? `${visits.current} customer ${visits.current === 1 ? "visit" : "visits"} came through Promotello in ${monthName}.`
        : strength === "interest"
            ? claims.current > 0
                ? `${claims.current} ${claims.current === 1 ? "voucher was" : "vouchers were"} claimed in ${monthName}, and nobody has come in with one yet.`
                : `${report.figures.followers} ${report.figures.followers === 1 ? "person is" : "people are"} following ${report.business_name} on Promotello.`
            : strength === "looking"
                ? `${looks} ${looks === 1 ? "person looked" : "people looked"} at ${report.business_name} in ${monthName}, and none of them claimed anything yet.`
                : `Nothing came through Promotello in ${monthName}.`;

    // What to do about it, where the numbers do not speak for
    // themselves. A report nobody can act on is a bill.
    const nudge = strength === "visits"
        ? null
        : strength === "nothing"
            ? "A live offer with an end date on it is what starts this: something worth making a trip for this week, mentioned when you serve somebody and on the poster by your counter."
            : "The gap between looking and coming in is usually the offer itself. Something with an end date on it, mentioned when you serve people, is what turns the next one into a visit.";

    const html = emailShell({
        rows: `<tr><td style="padding:16px 0 8px">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#FF593F">${e(report.business_name)} · ${e(monthName)}</p>
<h1 style="margin:12px 0 0;font-size:24px;line-height:1.3">${e(headline)}</h1>
<p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#45506a">${
        strength === "nothing"
            ? e(nudge ?? "")
            : `You now have ${report.figures.followers} ${report.figures.followers === 1 ? "follower" : "followers"}. Changes are against the month before.`
    }</p>
${strength === "nothing" ? "" : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">${tableRows}</table>`}
${nudge && strength !== "nothing" ? `<p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#45506a">${e(nudge)}</p>` : ""}
${firstTimers ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#FFF4EE;border-radius:12px"><tr><td style="padding:18px 20px"><p style="margin:0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#FF593F">First-timers, and who came back</p><p style="margin:8px 0 0;font-size:15px;line-height:1.6">${e(firstTimers)}</p></td></tr></table>` : ""}
<a href="${analyticsUrl}" style="display:inline-block;margin-top:24px;background:#FF593F;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">See full analytics</a>
</td></tr>`,
        footer: `<p style="max-width:${EMAIL_WIDTH}px;margin:20px auto 0;font-size:12px;line-height:1.6;color:#6b7387">Your monthly report from Promotello, sent to business owners on Growth.</p>`,
    });

    const text = [
        `${report.business_name} · ${monthName}`,
        headline,
        "",
        ...(strength === "nothing"
            ? [nudge ?? ""]
            : [
                ...rows.map(({ key, label }) => {
                    const metric = report.figures.metrics[key] ?? empty;
                    return `${label}: ${metric.current} (${changeText(metric)})`;
                }),
                "",
                `Followers: ${report.figures.followers}`,
                ...(nudge ? ["", nudge] : []),
            ]),
        ...(firstTimers ? ["", firstTimers] : []),
        `Full analytics: ${analyticsUrl}`,
        "",
        companyDisclosure(),
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

    // One extra read per business being emailed: the people numbers,
    // which the report itself counts in events rather than customers.
    const admin = createAdminClient();
    const firstTimers = new Map(
        await Promise.all(
            reports.map(async (report) => {
                const { data: rows, error: failed } = await admin.rpc("business_repeat_visits", {
                    requested_business_id: report.business_id,
                    months: 3,
                });

                if (failed) {
                    console.error("Monthly reports: first-visit numbers failed", failed);
                }

                return [report.business_id, readRepeatVisits(rows)] as const;
            }),
        ),
    );

    const { sent, failedTo } = await sendEmails(
        reports.flatMap((report) =>
            report.emails.map((to) =>
                monthlyReportEmail(report, to, monthName, firstTimers.get(report.business_id)),
            ),
        ),
    );

    if (failedTo.length > 0) {
        const lost = new Set(failedTo);
        const ids = reports.filter((report) => report.emails.some((to) => lost.has(to))).map((report) => report.business_id);

        await releaseClaims("Monthly reports", () =>
            createAdminClient()
                .from("monthly_report_sends")
                .delete()
                .eq("month", lastMonth.toISOString().slice(0, 10))
                .in("business_id", ids),
        );
    }

    return { businesses: reports.length, sent };
}
