import { brandedEmail, contactInbox, isDeliverable, sendEmails, type Email } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

// Emails around approval: the business hears when it, or one of its
// offers, is approved or turned down, and the Promotello inbox hears about
// each new business waiting for approval. All use the service role, so
// only call these after checking who's asking.

export type ReviewDecision = "approved" | "rejected";

type BusinessForEmail = { id: string; name: string; slug: string };

export function businessReviewedEmail(business: BusinessForEmail, decision: ReviewDecision, to: string): Email {
    if (decision === "approved") {
        const { html, text } = brandedEmail({
            eyebrow: "You're live",
            title: `${business.name} is live on Promotello`,
            paragraphs: [
                `Customers can now find ${business.name} on Promotello, along with your offers once each one is approved.`,
                "Next, print your QR poster from your dashboard and put it in your window or by the till. It's how passers-by find your offers and loyalty card.",
            ],
            action: { label: "See your page", url: absoluteUrl(`/businesses/${business.slug}`) },
            footer: "You're getting this because you run a business on Promotello.",
        });

        return { to, subject: `${business.name} is live on Promotello`, html, text };
    }

    const { html, text } = brandedEmail({
        eyebrow: "Your sign-up",
        title: `We couldn't approve ${business.name} yet`,
        paragraphs: [
            `Thanks for signing up. We weren't able to approve ${business.name} as it stands, usually because something in the profile, such as the address or description, needs a closer look.`,
            "Reply to this email and we'll tell you what's needed and help you get it sorted.",
        ],
        action: { label: "Contact us", url: absoluteUrl("/business/contact") },
        footer: "You're getting this because you signed up a business on Promotello.",
    });

    return { to, subject: `About ${business.name} on Promotello`, html, text };
}

type OfferForEmail = { id: string; title: string; slug: string; business: { id: string; name: string } };

export function offerReviewedEmail(offer: OfferForEmail, decision: ReviewDecision, to: string): Email {
    if (decision === "approved") {
        const { html, text } = brandedEmail({
            eyebrow: "Offer approved",
            title: `"${offer.title}" is live`,
            paragraphs: [
                `Customers can now see and claim it on ${offer.business.name}'s page and in the Promotello offers directory.`,
                "Mention it to customers at the till, or put your QR poster up so passers-by can claim it too.",
            ],
            action: { label: "See your offer", url: absoluteUrl(`/offers/${offer.slug}`) },
            footer: `You're getting this because you manage ${offer.business.name} on Promotello.`,
        });

        return { to, subject: `Your offer is live: ${offer.title}`, html, text };
    }

    const { html, text } = brandedEmail({
        eyebrow: "Offer not approved",
        title: `"${offer.title}" wasn't approved`,
        paragraphs: [
            "We couldn't approve this offer as written. The usual reasons are unclear terms, or a discount that's hard to check at the till.",
            "Reply to this email and we'll tell you what to change.",
        ],
        action: { label: "Open your offers", url: absoluteUrl(`/business/${offer.business.id}/offers`) },
        footer: `You're getting this because you manage ${offer.business.name} on Promotello.`,
    });

    return { to, subject: `Your offer wasn't approved: ${offer.title}`, html, text };
}

export function newBusinessAlertEmail(
    business: { name: string; category: string | null; city: string | null },
    owner: string,
    claimedPreview: boolean,
): Email {
    const what = [business.category, business.city].filter(Boolean).join(", ");
    const { html, text } = brandedEmail({
        eyebrow: claimedPreview ? "Preview claimed" : "New sign-up",
        title: `${business.name} is waiting for approval`,
        paragraphs: [
            `${business.name}${what ? ` (${what})` : ""} ${claimedPreview ? "was claimed from its preview" : "just signed up"}. It's hidden from customers until it's approved.`,
            `Owner: ${owner}`,
        ],
        action: { label: "Review it", url: absoluteUrl("/admin/businesses") },
        footer: "Sent to the Promotello inbox for every new business.",
    });

    return { to: contactInbox, subject: `New business: ${business.name}`, html, text };
}

async function managerEmails(businessId: string) {
    const { data } = await createAdminClient().rpc("business_manager_emails", { requested_business_id: businessId });
    return (data ?? []) as string[];
}

export async function emailBusinessReviewed(businessId: string, decision: ReviewDecision) {
    const { data: business } = await createAdminClient()
        .from("businesses")
        .select("id, name, slug")
        .eq("id", businessId)
        .maybeSingle();

    if (!business) return { sent: 0 };

    const emails = await managerEmails(businessId);
    return sendEmails(emails.map((to) => businessReviewedEmail(business, decision, to)));
}

export async function emailOfferReviewed(offerId: string, decision: ReviewDecision) {
    const { data } = await createAdminClient()
        .from("offers")
        .select("id, title, slug, businesses ( id, name )")
        .eq("id", offerId)
        .maybeSingle();

    const business = Array.isArray(data?.businesses) ? data.businesses[0] : data?.businesses;

    if (!data || !business) return { sent: 0 };

    const offer = { id: data.id, title: data.title, slug: data.slug, business };
    const emails = await managerEmails(business.id);
    return sendEmails(emails.map((to) => offerReviewedEmail(offer, decision, to)));
}

export async function alertNewBusiness(businessId: string, owner: string, claimedPreview = false) {
    // Test sign-ups would otherwise reach the real inbox.
    if (!isDeliverable(owner)) return { sent: 0 };

    const { data } = await createAdminClient()
        .from("businesses")
        .select("name, category, business_locations ( city )")
        .eq("id", businessId)
        .maybeSingle();

    if (!data) return { sent: 0 };

    const city = data.business_locations?.[0]?.city ?? null;
    return sendEmails([newBusinessAlertEmail({ name: data.name, category: data.category, city }, owner, claimedPreview)]);
}
