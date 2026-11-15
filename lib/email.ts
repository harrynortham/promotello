import * as Sentry from "@sentry/nextjs";

import { storedImage } from "@/lib/images";
import { companyDisclosure } from "@/lib/legal";
import { socialProfiles } from "@/lib/site";
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

// Where contact-form messages and new sign-up alerts go.
export const contactInbox = setting(process.env.CONTACT_EMAIL) ?? "support@promotello.com";

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
export function isDeliverable(address: string) {
    return !/@([^@]+\.)?(test\.internal|internal|test|example|invalid|localhost)$|@example\.(com|org|net)$/i.test(address);
}

const BATCH_SIZE = 100; // Resend's batch limit.
const ATTEMPTS = 3;
const BACKOFF_MS = [500, 2000];

// Worth trying again: rate limits, Resend being briefly unwell, a dropped
// connection. A 401 or a malformed From address will fail the same way
// every time, so those are reported straight away.
function retryable(status: number) {
    return status === 408 || status === 429 || status >= 500;
}

async function sendBatch(apiKey: string, payload: unknown[]) {
    let lastReason = "";

    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        let status = 0;

        try {
            const response = await fetch("https://api.resend.com/emails/batch", {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) return { ok: true as const };

            status = response.status;
            lastReason = `${status} ${(await response.text()).slice(0, 300)}`;

            if (!retryable(status)) return { ok: false as const, reason: lastReason };
        } catch (error) {
            lastReason = error instanceof Error ? error.message : String(error);
        }

        if (attempt < ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt - 1]));
        }
    }

    return { ok: false as const, reason: `${lastReason} (after ${ATTEMPTS} attempts)` };
}

export type SendResult = {
    sent: number;
    failed: number;
    skipped: number;
    // Who the message actually went to. Not simply "everyone minus failedTo":
    // with sending switched off, or for an address that can never receive,
    // nothing is attempted and nobody is in here.
    sentTo: string[];
    // Who did not get their email. Callers that claimed a send before making
    // it use this to release the claim, so the next run tries again instead
    // of the message being lost.
    failedTo: string[];
};

export async function sendEmails(emails: Email[]): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = setting(process.env.EMAIL_FROM);
    const deliverable = emails.filter((email) => isDeliverable(email.to));

    // Skipped: test addresses, or sending isn't set up. Not a failure.
    const undeliverable = emails.length - deliverable.length;

    if (!apiKey || !from) {
        if (deliverable.length > 0) {
            console.warn(`Email: RESEND_API_KEY or EMAIL_FROM not set, skipped ${deliverable.length} email(s)`);
        }
        return { sent: 0, failed: 0, skipped: emails.length, sentTo: [], failedTo: [] };
    }

    const sentTo: string[] = [];
    const failedTo: string[] = [];

    for (let i = 0; i < deliverable.length; i += BATCH_SIZE) {
        const batch = deliverable.slice(i, i + BATCH_SIZE);

        const result = await sendBatch(
            apiKey,
            batch.map(({ senderName, replyTo: emailReplyTo, ...email }) => ({
                from: senderFor(from, senderName),
                reply_to: emailReplyTo ?? replyTo,
                ...email,
            })),
        );

        if (result.ok) {
            sentTo.push(...batch.map((email) => email.to));
        } else {
            failedTo.push(...batch.map((email) => email.to));
            console.error("Email: Resend batch failed", result.reason);
            // Reported so a broken setting can't stop emails unnoticed.
            Sentry.captureMessage(`Resend rejected ${batch.length} email(s): ${result.reason}`, "error");
        }
    }

    return { sent: sentTo.length, failed: failedTo.length, skipped: undeliverable, sentTo, failedTo };
}

// The Promotello logo at the top of every email: a PNG (Gmail and Outlook
// don't show SVG), at twice its display size for sharp screens, with alt
// text for apps that block images.
export function emailLogoRow() {
    return `<tr><td style="padding:0 0 4px"><img src="${absoluteUrl("/brand/promotello-email-logo.png")}" width="150" height="40" alt="Promotello" style="display:block;width:150px;height:auto;border:0;outline:none;text-decoration:none;color:#FF593F;font-size:20px;font-weight:700"></td></tr>`;
}

export function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Where Promotello is, elsewhere. The same six accounts the website's
// footer links to (socialProfiles), so the two never disagree, and the
// file names are the network keys — nothing to keep in step by hand.
//
// A business deciding whether to put its name next to ours looks for
// signs we are a real company, and a row of accounts it can go and
// look at is one of them — which is also why this is switched off at
// the moment. An account with a handful of followers is evidence
// against the thing it was put there to prove, so these go back when
// there is a following worth sending somebody to. See emailShell().
//
// The badges are the circle in the footer's grey with the glyph in
// white, drawn at half their size so they stay sharp on a phone, and
// every one carries its name in alt text for the clients that block
// images by default.
export function emailSocialRow() {
    const icons = socialProfiles
        .map(
            (profile) =>
                `<td style="padding:0 5px"><a href="${profile.url}" style="text-decoration:none"><img src="${absoluteUrl(
                    `/email/social/${profile.network}.png`,
                )}" width="30" height="30" alt="${escapeHtml(profile.label)}" style="display:block;width:30px;height:30px;border:0;outline:none"></a></td>`,
        )
        .join("");

    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto 0"><tr>${icons}</tr></table>`;
}

// The company's registered details, at the foot of every email: UK law
// requires them in business emails.
export function emailCompanyFooter(width = EMAIL_WIDTH) {
    return `<p style="max-width:${width}px;margin:12px auto 0;font-size:11px;line-height:1.6;color:#8a91a3">${escapeHtml(companyDisclosure())}</p>`;
}

// How wide an email's words are allowed to get. One number, shared,
// because the four templates had drifted to 520 and 560 apiece.
export const EMAIL_WIDTH = 600;

// The shell every email is drawn in: the logo, one column of content,
// and the legal footer under it.
//
// There is no card and no coloured page behind it. A white email on a
// white background is the shape every email an ordinary person gets
// has — a border and a tinted page say "marketing" before a word is
// read, and they cost about 60px of width on a phone, which is where
// nearly all of these are opened.
//
// `rows` are table rows, because that is the only layout every mail
// client agrees on.
export function emailShell({
    rows,
    footer = "",
    width = EMAIL_WIDTH,
    social = false,
}: {
    rows: string;
    footer?: string;
    width?: number;
    // The row of accounts at the foot of the email, off everywhere
    // until there is a following worth sending anybody to — sending a
    // business to an account with nine followers argues against us.
    // Turn it back on by making this true: the icons, the links and
    // the test that keeps them in step with lib/site.ts are all still
    // here, and the artwork is the grey badges.
    social?: boolean;
}) {
    return `<!doctype html>
<html><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#17233B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width}px">
${emailLogoRow()}
${rows}
</table>
${footer}
${social ? emailSocialRow() : ""}
${emailCompanyFooter(width)}
</td></tr></table>
</body></html>`;
}

// Whose email this is, drawn above everything else: their logo and
// their name.
//
// Two rules, both from how email actually arrives. Images are blocked by
// default in a lot of clients, so the name is live text beside the
// picture rather than inside it — blocked, this still reads as an email
// about their business. And the URL goes through storedImage(), so
// anything that is not a public file on our own storage renders as no
// logo at all rather than as a broken box.
//
// The initials stand in where there is no logo, the way
// components/business-initial.tsx does on screen.
export function emailBusinessRow(business: { name: string; logoUrl?: string | null }) {
    const e = escapeHtml;
    const logo = emailSafeImage(business.logoUrl);

    const mark = logo
        ? `<img src="${e(logo)}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0;outline:none;border-radius:10px;object-fit:cover;background:#FFF4EE">`
        : `<table role="presentation" cellpadding="0" cellspacing="0" style="width:44px;height:44px;background:#FFF4EE;border-radius:10px"><tr><td align="center" style="font-size:16px;font-weight:700;color:#FF593F">${e(initialsFrom(business.name))}</td></tr></table>`;

    return `<tr><td style="padding:4px 0 2px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px">${mark}</td>
<td style="font-size:15px;font-weight:600;color:#17233B">${e(business.name)}</td>
</tr></table>
</td></tr>`;
}

// Up to two initials, for the block that stands in for a missing logo.
function initialsFrom(name: string) {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "P"
    );
}

// A stored image an email client will actually draw.
//
// storedImage() settles whether it is ours and public. This settles the
// format: Outlook on Windows renders mail through Word, which has never
// supported WebP, so a .webp logo arrives as a red cross rather than as
// a logo. Our uploader keeps whatever was given to it (lib/
// business-images.ts), so these exist — only a couple today, but the
// failure is ugly and the fallback is free.
export function emailSafeImage(url: string | null | undefined) {
    const stored = storedImage(url);

    if (!stored) return null;

    return new URL(stored).pathname.toLowerCase().endsWith(".webp") ? null : stored;
}

// A picture of the thing the email is about — an offer's own photograph.
// It decorates: every email below reads the same with images turned off,
// so nothing here may carry meaning the words do not.
export function emailPictureRow(picture: { url: string; alt: string }, width = EMAIL_WIDTH) {
    const e = escapeHtml;
    const src = emailSafeImage(picture.url);

    if (!src) return "";

    return `<tr><td style="padding:20px 0 0">
<img src="${e(src)}" width="${width}" alt="${e(picture.alt)}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;outline:none;border-radius:14px">
</td></tr>`;
}

// A simple branded email: heading, paragraphs and one button. Text is
// escaped here, so pass plain strings.
export function brandedEmail({
    eyebrow,
    title,
    paragraphs,
    business,
    picture,
    code,
    voucher,
    details,
    action,
    footer,
    footerLinks = [],
}: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    // Whose business this email is about: their logo and their name,
    // above the eyebrow. Left out for anything that is about us.
    business?: { name: string; logoUrl?: string | null };
    // A picture of the thing — an offer's photograph, under the words.
    picture?: { url: string; alt: string };
    // A one-time code, shown big enough to read off a phone and copy. It
    // is the whole point of the email it appears in, so it sits above
    // anything else and there is nothing to press.
    code?: string;
    // A claimed voucher, drawn the way the offer page draws it once it is
    // claimed: the same navy card, the same QR for staff to scan, the same
    // code underneath it. Somebody at the till has the email open, not the
    // website, so it has to be the thing itself rather than a link to it.
    voucher?: { code: string; qrUrl: string };
    // Small labelled blocks under the main message — what an offer covers,
    // what its terms say. Quieter than a paragraph, because they are read
    // when a question comes up rather than straight through.
    details?: { label: string; text: string }[];
    // Left out for notices with nothing to click.
    action?: { label: string; url: string };
    footer: string;
    // e.g. unsubscribe and settings links under the footer text.
    footerLinks?: { label: string; url: string }[];
}) {
    const e = escapeHtml;

    const html = emailShell({
        rows: `${business ? emailBusinessRow(business) : ""}<tr><td style="padding:16px 0 8px">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#FF593F">${e(eyebrow)}</p>
<h1 style="margin:12px 0 0;font-size:26px;line-height:1.25">${e(title)}</h1>
${paragraphs.map((text) => `<p style="margin:14px 0 0;font-size:16px;line-height:1.65;color:#45506a">${e(text)}</p>`).join("\n")}
</td></tr>
${picture ? emailPictureRow(picture) : ""}
${code ? `<tr><td style="padding:20px 0 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;border-radius:12px"><tr><td align="center" style="padding:18px 16px">
<p style="margin:0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6b7387">Your code</p>
<p style="margin:10px 0 0;font-size:34px;font-weight:700;line-height:1.2;letter-spacing:.18em;text-indent:.18em;color:#17233B">${e(code)}</p>
</td></tr></table>
</td></tr>
` : ""}${voucher ? `<tr><td style="padding:20px 0 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17233B;border-radius:16px"><tr><td align="center" style="padding:26px 20px">
<span style="display:inline-block;padding:5px 12px;border:1px solid #3a4258;border-radius:999px;font-size:12px;font-weight:600;color:#c6cbd8">Your claimed voucher</span>
<p style="margin:18px 0 0;font-size:13px;color:#aab1c2">Your redemption code</p>
<img src="${e(voucher.qrUrl)}" width="160" height="160" alt="QR code for your voucher" style="display:block;margin:14px auto 0;width:160px;height:160px;border:0;outline:none;border-radius:12px;background:#ffffff">
<p style="margin:14px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace;font-size:28px;font-weight:700;line-height:1.2;letter-spacing:.2em;text-indent:.2em;color:#ffffff">${e(voucher.code)}</p>
<p style="margin:14px auto 0;max-width:340px;font-size:13px;line-height:1.6;color:#aab1c2">Show this to staff when you pay. They can scan it or type the code.</p>
</td></tr></table>
</td></tr>
` : ""}${details?.length ? `<tr><td style="padding:18px 0 0">
${details
    .map(
        (detail) => `<p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8a91a3">${e(detail.label)}</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#45506a;white-space:pre-line">${e(detail.text)}</p>`,
    )
    .join("\n")}
</td></tr>
` : ""}${action ? `<tr><td style="padding:20px 0 8px">
<a href="${e(action.url)}" style="display:inline-block;background:#FF593F;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:10px">${e(action.label)}</a>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6b7387;word-break:break-all">Or open this link: ${e(action.url)}</p>
</td></tr>` : ""}`,
        footer: `<p style="max-width:${EMAIL_WIDTH}px;margin:20px auto 0;font-size:12px;line-height:1.6;color:#6b7387">${e(footer)}${footerLinks.length ? "<br>" + footerLinks.map((link) => `<a href="${e(link.url)}" style="color:#6b7387">${e(link.label)}</a>`).join(" · ") : ""}</p>`,
    });

    const text = [
        title,
        "",
        ...(code ? [`Your code: ${code}`, ""] : []),
        ...(voucher
            ? [
                  `Your redemption code: ${voucher.code}`,
                  "Show this to staff when you pay. They can scan it or type the code.",
                  "",
              ]
            : []),
        ...paragraphs.flatMap((p) => [p, ""]),
        ...(details ?? []).flatMap((detail) => [`${detail.label}: ${detail.text}`, ""]),
        ...(action ? [`${action.label}: ${action.url}`, ""] : []),
        footer,
        ...footerLinks.map((link) => `${link.label}: ${link.url}`),
        "",
        companyDisclosure(),
    ].join("\n");

    return { html, text };
}
