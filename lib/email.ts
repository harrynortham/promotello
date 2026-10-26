import * as Sentry from "@sentry/nextjs";

import { absoluteUrl } from "@/lib/site";

// Sends email through Resend. Needs RESEND_API_KEY and EMAIL_FROM (a sender
// on a domain verified in Resend: "Promotello <offers@mail.promotello.com>".
// (auth.promotello.com is kept for Supabase's sign-in emails only.)
// Without them nothing is sent, so local development and tests are safe.
//
// Replies go to EMAIL_REPLY_TO (default hello@promotello.com), a real
// inbox: the sending subdomain has no mailbox.
// Settings pasted into Vercel with their quotes ("Promotello <…>") would be
// rejected by Resend, so stray quotes and spaces are removed.
function setting(value: string | undefined) {
    return value?.trim().replace(/^(["'])(.*)\1$/, "$2").trim() || undefined;
}

const replyTo = setting(process.env.EMAIL_REPLY_TO) ?? "hello@promotello.com";

export type Email = {
    to: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
    // Overrides EMAIL_REPLY_TO, e.g. the sender of a contact form message.
    replyTo?: string;
    // Shown as "<senderName> via Promotello", sent from EMAIL_FROM's address.
    // Only for emails on a business's behalf to its followers (new offers,
    // automation vouchers). Account emails come from plain "Promotello":
    // one address with many display names looks like spoofing to filters.
    senderName?: string;
};

// EMAIL_FROM may be "Name <address>" or just an address.
function fromAddress(from: string) {
    return from.match(/<([^>]+)>/)?.[1]?.trim() ?? from.trim();
}

function senderFor(from: string, senderName?: string) {
    // Drop characters that could break or spoof the From header.
    const name = senderName?.replace(/["<>\\\r\n]/g, "").replace(/\s+/g, " ").trim();

    return name ? `"${name} via Promotello" <${fromAddress(from)}>` : from;
}

// Addresses that can never receive mail (test accounts, reserved domains).
function isDeliverable(address: string) {
    return !/@([^@]+\.)?(test\.internal|internal|test|example|invalid|localhost)$|@example\.(com|org|net)$/i.test(address);
}

const BATCH_SIZE = 100; // Resend's batch limit.

export async function sendEmails(emails: Email[]) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = setting(process.env.EMAIL_FROM);
    const deliverable = emails.filter((email) => isDeliverable(email.to));

    // Skipped: test addresses, or sending isn't set up. Not a failure.
    const undeliverable = emails.length - deliverable.length;

    if (!apiKey || !from) {
        if (deliverable.length > 0) {
            console.warn(`Email: RESEND_API_KEY or EMAIL_FROM not set, skipped ${deliverable.length} email(s)`);
        }
        return { sent: 0, failed: 0, skipped: emails.length };
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < deliverable.length; i += BATCH_SIZE) {
        const batch = deliverable.slice(i, i + BATCH_SIZE);

        const response = await fetch("https://api.resend.com/emails/batch", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(
                batch.map(({ senderName, replyTo: emailReplyTo, ...email }) => ({
                    from: senderFor(from, senderName),
                    reply_to: emailReplyTo ?? replyTo,
                    ...email,
                })),
            ),
        });

        if (response.ok) {
            sent += batch.length;
        } else {
            failed += batch.length;
            const reason = await response.text();
            console.error("Email: Resend batch failed", response.status, reason);
            // Reported so a broken setting can't stop emails unnoticed.
            Sentry.captureMessage(`Resend rejected ${batch.length} email(s): ${response.status} ${reason.slice(0, 300)}`, "error");
        }
    }

    return { sent, failed, skipped: undeliverable };
}

// The Promotello logo at the top of every email: a PNG (Gmail and Outlook
// don't show SVG), at twice its display size for sharp screens, with alt
// text for apps that block images.
export function emailLogoRow() {
    return `<tr><td style="padding:24px 28px 0"><img src="${absoluteUrl("/brand/promotello-email-logo.png")}" width="150" height="40" alt="Promotello" style="display:block;width:150px;height:auto;border:0;outline:none;text-decoration:none;color:#FF593F;font-size:20px;font-weight:700"></td></tr>`;
}

export function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// A simple branded email: heading, paragraphs and one button. Text is
// escaped here, so pass plain strings.
export function brandedEmail({
    eyebrow,
    title,
    paragraphs,
    action,
    footer,
    footerLinks = [],
}: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    action: { label: string; url: string };
    footer: string;
    // e.g. unsubscribe and settings links under the footer text.
    footerLinks?: { label: string; url: string }[];
}) {
    const e = escapeHtml;

    const html = `<!doctype html>
<html><body style="margin:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#17233B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e8e2da">
${emailLogoRow()}
<tr><td style="padding:20px 28px 8px">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#FF593F">${e(eyebrow)}</p>
<h1 style="margin:12px 0 0;font-size:24px;line-height:1.25">${e(title)}</h1>
${paragraphs.map((text) => `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#45506a">${e(text)}</p>`).join("\n")}
</td></tr>
<tr><td style="padding:20px 28px 28px">
<a href="${e(action.url)}" style="display:inline-block;background:#FF593F;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${e(action.label)}</a>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6b7387;word-break:break-all">Or open this link: ${e(action.url)}</p>
</td></tr>
</table>
<p style="max-width:520px;margin:20px auto 0;font-size:12px;line-height:1.6;color:#6b7387">${e(footer)}${footerLinks.length ? "<br>" + footerLinks.map((link) => `<a href="${e(link.url)}" style="color:#6b7387">${e(link.label)}</a>`).join(" · ") : ""}</p>
</td></tr></table>
</body></html>`;

    const text = [
        title,
        "",
        ...paragraphs.flatMap((p) => [p, ""]),
        `${action.label}: ${action.url}`,
        "",
        footer,
        ...footerLinks.map((link) => `${link.label}: ${link.url}`),
    ].join("\n");

    return { html, text };
}
