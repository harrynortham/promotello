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

// Cold email does not go out on the address that carries vouchers,
// receipts and stamp notifications. Without its own sender configured,
// the queue drafts and holds, and the dashboard says why.
export function outreachSender() {
    return process.env[OUTREACH_FROM]?.trim() || null;
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
    return body
        .split(/\n{2,}/)
        .map((paragraph) => `<p style="margin:0 0 16px">${paragraph.replace(/\n/g, "<br>").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`)
        .join("");
}
