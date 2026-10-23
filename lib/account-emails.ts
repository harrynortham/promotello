import { brandedEmail, type Email } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";

// Service emails about accounts and teams. These aren't marketing, so they
// carry no unsubscribe link.

export function teamInvitationEmail({
    to,
    token,
    businessName,
    inviterName,
    role,
}: {
    to: string;
    token: string;
    businessName: string;
    inviterName: string;
    role: "admin" | "member";
}): Email {
    const { html, text } = brandedEmail({
        eyebrow: "Team invitation",
        title: `Join ${businessName} on Promotello`,
        paragraphs: [
            `${inviterName} has invited you to join ${businessName} as ${role === "admin" ? "an admin" : "a team member"}.`,
            role === "admin"
                ? "Admins can manage promotions, redeem vouchers and stamp loyalty cards."
                : "Team members can redeem vouchers and stamp loyalty cards at the till.",
            "Sign in or create an account with this email address to accept. The invitation lasts 7 days.",
        ],
        action: { label: "Accept invitation", url: absoluteUrl(`/invite/${token}`) },
        footer: "If you weren't expecting this, you can ignore it.",
    });

    return { to, subject: `You're invited to join ${businessName} on Promotello`, html, text, senderName: businessName };
}

export function handOverEmail({
    to,
    token,
    businessName,
}: {
    to: string;
    token: string;
    businessName: string;
}): Email {
    const { html, text } = brandedEmail({
        eyebrow: "Your business is ready",
        title: `${businessName} is set up on Promotello`,
        paragraphs: [
            `We've set up ${businessName} on Promotello for you. Accept to become its owner and take it from here.`,
            "You'll manage promotions, loyalty cards, QR posters and your team, and can start your free Pro trial whenever you're ready.",
            "Sign in or create an account with this email address to accept. The link lasts 14 days.",
        ],
        action: { label: "Take over my business", url: absoluteUrl(`/invite/${token}`) },
        footer: "If you weren't expecting this, you can ignore it.",
    });

    return { to, subject: `${businessName} is ready for you on Promotello`, html, text };
}

export function voucherConfirmationEmail({
    to,
    code,
    offerTitle,
    discount,
    businessName,
    expiresAt,
}: {
    to: string;
    code: string;
    offerTitle: string;
    discount: string;
    businessName: string;
    expiresAt: string | null;
}): Email {
    const until = expiresAt
        ? new Date(`${expiresAt.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        : null;

    const { html, text } = brandedEmail({
        eyebrow: `Your voucher for ${businessName}`,
        title: `${discount}: ${offerTitle}`,
        paragraphs: [
            `Your voucher code is ${code}.`,
            "Show the QR code in My vouchers at the till, or tell staff your code.",
            ...(until ? [`Use it by ${until}.`] : []),
        ],
        action: { label: "Open my vouchers", url: absoluteUrl("/dashboard/redemptions") },
        footer: "You're getting this because you claimed a voucher on Promotello.",
    });

    return { to, subject: `Your voucher: ${discount} at ${businessName}`, html, text, senderName: businessName };
}
