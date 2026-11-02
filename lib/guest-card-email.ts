import { brandedEmail, type Email } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";

// The link to a card someone joined without an account. Without this they
// have one browser tab and nothing else, so it goes out as soon as they join.
export function guestCardEmail({
    to,
    name,
    businessName,
    token,
}: {
    to: string;
    name: string;
    businessName: string;
    token: string;
}): Email {
    const url = absoluteUrl(`/card/${token}`);
    const firstName = name.trim().split(/\s+/)[0];

    const { html, text } = brandedEmail({
        eyebrow: "Your loyalty card",
        title: `Your ${businessName} card`,
        paragraphs: [
            `Hi ${firstName}, your loyalty card at ${businessName} is ready.`,
            "Open it on your phone when you pay and staff will scan it to add a stamp. Keep this email, or add the link to your home screen, so you can always find it.",
            "You can turn it into a Promotello account later with this same email address, and your stamps come with you.",
        ],
        action: { label: "Open my card", url },
        footer: `You're getting this because you joined the loyalty card at ${businessName}.`,
    });

    return {
        to,
        subject: `Your loyalty card at ${businessName}`,
        html,
        text,
    };
}
