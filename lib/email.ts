// Sends email through Resend. Needs RESEND_API_KEY and EMAIL_FROM (a sender
// on a domain verified in Resend, e.g. "Promotello <offers@promotello.com>").
// Without them nothing is sent, so local development and tests are safe.

export type Email = {
    to: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
    // Shown as "<senderName> via Promotello", sent from EMAIL_FROM's address.
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
    const from = process.env.EMAIL_FROM;
    const deliverable = emails.filter((email) => isDeliverable(email.to));

    if (!apiKey || !from) {
        if (deliverable.length > 0) {
            console.warn(`Email: RESEND_API_KEY or EMAIL_FROM not set, skipped ${deliverable.length} email(s)`);
        }
        return { sent: 0, failed: 0 };
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
                batch.map(({ senderName, ...email }) => ({ from: senderFor(from, senderName), ...email })),
            ),
        });

        if (response.ok) {
            sent += batch.length;
        } else {
            failed += batch.length;
            console.error("Email: Resend batch failed", response.status, await response.text());
        }
    }

    return { sent, failed };
}

export function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
