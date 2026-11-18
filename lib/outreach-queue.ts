import { SIGNATURE_HTML, signatureText } from "@/lib/email-signature";

// Drafting and sending the queued outreach.
//
// The drafting reuses what the previews page already composes, so the
// email a lead gets is the one that has been read and argued over for
// months — subject, the directory section, the founding price, the
// opt-out line — rather than a second version of it that drifts.
//
// Nothing here sends on its own. A draft waits in outreach_messages
// until somebody reads it and presses send.

export const OUTREACH_FROM = "OUTREACH_EMAIL_FROM";

// What the Gmail signature used to add, and now has to be added here.
//
// outreachMessage() carries no company footer on purpose — "the Companies
// Act disclosure is in the email signature, and sending it twice reads
// badly" — which was true while every outreach email was pasted into
// Gmail by hand. Sent from the app there is no signature, and a business
// email from a limited company has to give the registered name, number,
// place of registration and office. So the queue adds it to the draft,
// where it is also read before anybody approves it.
// The signature carries it now (lib/email-signature.ts), so this is what
// goes on a draft: the letter, then the signature in full, so the thing
// read in the outbox before approving is the thing that is sent. Adding
// the disclosure here as well would print the registered office twice.
export function withSignature(body: string) {
    return `${body}\n\n—\n${signatureText()}`;
}

// Cold email does not go out on the address that carries vouchers,
// receipts and stamp notifications. Without its own sender configured,
// the queue drafts and holds, and the dashboard says why.
export function outreachSender() {
    const value = process.env[OUTREACH_FROM]?.trim();

    // A domain is not a From address. Set to "team.promotello.com" this
    // used to count as configured, enable the Send button, and fail at
    // Resend — which reads as the queue being broken rather than as a
    // setting being half written. Either "name@domain" or
    // "Name <name@domain>".
    if (!value || !/^[^<>@]*<?[^<>@\s]+@[^<>@\s]+\.[a-z]{2,}>?$/i.test(value)) {
        return null;
    }

    return value;
}

// The follow-up is the same thread four or five days later, so it is
// short and refers back rather than repeating the pitch. One follow-up,
// and then it becomes a letter (docs/OUTREACH.md).
export function followUpMessage(businessName: string, url: string, sender: string) {
    const first = sender.trim().split(/\s+/)[0];

    return [
        `I wrote last week about the page I built for ${businessName}:`,
        "",
        url,
        "",
        "It is still there, and still free to claim. If it is not for you, reply \"no thanks\" and I will not write again.",
        "",
        first && first !== "The" ? first : "The Promotello team",
    ].join("\n");
}

export function followUpSubject(businessName: string) {
    return `${businessName} on Promotello`;
}

// Plain text with the paragraphs kept, because these are written as a
// person writing to a shop, not as a template with a header image. The
// branded wrapper is for the product's own email; this is not that.
export function asHtml(body: string) {
    // The draft already ends with the signature as text, because that is
    // what is read before approving. In HTML it is the real one, so the
    // text version is taken off and the markup put in its place —
    // otherwise the name and the registered office appear twice.
    const letter = body.split(`\n\n—\n${signatureText()}`)[0];

    const paragraphs = letter
        .split(/\n{2,}/)
        .map((paragraph) => `<p style="margin:0 0 16px">${paragraph.replace(/\n/g, "<br>").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`)
        .join("");

    return `${paragraphs}${SIGNATURE_HTML}`;
}
