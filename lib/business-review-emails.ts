import { brandedEmail, contactInbox, isDeliverable, sendEmails, type Email } from "@/lib/email";
import { businessRecipients, greeting } from "@/lib/recipients";
import {
    declineLines,
    findReason,
    helpAnchor,
    type ReviewAction,
    type ReviewOf,
} from "@/lib/review-reasons";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

// Emails around approval: the business hears when it, or one of its
// offers, is approved or turned down, and the Promotello inbox hears about
// each new business and each offer waiting for approval. All use the
// service role, so only call these after checking who's asking.

export type ReviewDecision = "approved" | "rejected" | "suspended";

// Why it wasn't approved, read off the row the review function wrote.
// Absent on anything declined before declines carried a reason, which
// is why every email below still reads without one.
//
// `previous` is the status it is coming from, which only the caller
// knows by the time the row has been written. It is the difference
// between "you're live" and "you're back": a business that has been
// open for a year does not want to be told to print its first poster.
export type Review = {
    reason?: string | null;
    note?: string | null;
    previous?: string | null;
};

// The three parts of a decline that are the same in all three emails:
// the cause and the note, read straight through; what to change and what
// happens next as labelled blocks under it; and the way to reach a
// person. The blocks render after the paragraphs, which is why the
// reassurance is one of them rather than a last line — otherwise it
// lands above the thing it is reassuring them about.
function declineParts(
    of: ReviewOf,
    action: ReviewAction,
    review: Review | undefined,
    opening: string,
    next: string,
) {
    const lines = declineLines(of, action, review?.reason, review?.note);
    const fix = findReason(of, action, review?.reason)?.fix;

    const article = action === "suspended"
        ? "What suspended means"
        : of === "business"
            ? "Why a business isn't approved"
            : "Why an offer isn't approved";

    return {
        paragraphs: lines.length > 0
            ? [opening, ...lines.filter((line) => line !== fix)]
            : [opening, "Reply to this email and we'll tell you what's needed and help you get it sorted."],
        details: [
            ...(fix ? [{ label: action === "suspended" ? "What puts it back" : "What to change", text: fix }] : []),
            { label: "What happens next", text: next },
        ],
        footerLinks: [
            { label: article, url: absoluteUrl(helpAnchor(of, action)) },
            { label: "Email us", url: absoluteUrl("/business/contact") },
        ],
    };
}

type BusinessForEmail = { id: string; name: string; slug: string; logo_url?: string | null };

export function businessReviewedEmail(
    business: BusinessForEmail,
    decision: ReviewDecision,
    to: string,
    review?: Review,
    name?: string | null,
): Email {
    // Their logo over every one of these, and their name in the first
    // line where they gave us one.
    const mark = { name: business.name, logoUrl: business.logo_url };
    const hello = greeting(name);

    if (decision === "approved") {
        // Back after a suspension is not the same event as being
        // approved for the first time, and telling somebody who has
        // been open a year to print their first poster reads as broken.
        if (review?.previous === "suspended") {
            const { html, text } = brandedEmail({
            business: mark,
            eyebrow: "Back up",
                title: `${business.name} is back on Promotello`,
                paragraphs: [
                    `${hello}Thanks for sorting that out. ${business.name} is visible to customers again, along with every offer that was live before.`,
                    "Nothing was lost while it was down: your loyalty cards kept their stamps, your posters still point at the same places, and your followers are still following.",
                ],
                action: { label: "See your page", url: absoluteUrl(`/businesses/${business.slug}`) },
                footer: "You're getting this because you run a business on Promotello.",
            });

            return { to, subject: `${business.name} is back on Promotello`, html, text };
        }

        const { html, text } = brandedEmail({
            business: mark,
            eyebrow: "You're live",
            title: `${business.name} is live on Promotello`,
            paragraphs: [
                `${hello}Customers can now find ${business.name} on Promotello, along with your offers once each one is approved.`,
                "Next, print your QR poster from your dashboard and put it in your window or by the counter. It's how passers-by find your offers and loyalty card.",
            ],
            action: { label: "See your page", url: absoluteUrl(`/businesses/${business.slug}`) },
            footer: "You're getting this because you run a business on Promotello.",
        });

        return { to, subject: `${business.name} is live on Promotello`, html, text };
    }

    // Taken down after being live. Everything of theirs is still there,
    // and saying so is the difference between a problem and a loss.
    if (decision === "suspended") {
        const parts = declineParts(
            "business",
            "suspended",
            review,
            `${hello}We've taken ${business.name} off Promotello for now, and this is why.`,
            "Nothing is deleted: your profile, your offers, your loyalty cards and their stamps are all exactly as you left them, and they come back the moment this is settled. Reply to this email and we'll deal with it today.",
        );

        const { html, text } = brandedEmail({
            business: mark,
            eyebrow: "Taken down",
            title: `${business.name} is off Promotello for now`,
            paragraphs: parts.paragraphs,
            details: parts.details,
            action: { label: "Reply or contact us", url: absoluteUrl("/business/contact") },
            footer: "You're getting this because you run a business on Promotello.",
            footerLinks: parts.footerLinks,
        });

        return { to, subject: `${business.name} is off Promotello for now`, html, text };
    }

    const parts = declineParts(
        "business",
        "rejected",
        review,
        `${hello}Thanks for signing up. We weren't able to approve ${business.name} as it stands, and this is what stopped us.`,
        "Send the page back to us from your dashboard when it's done and we'll look again the same day. Reply to this email if anything here is unclear — it reaches a person, not a form.",
    );

    const { html, text } = brandedEmail({
        business: mark,
        eyebrow: "Your sign-up",
        title: `We couldn't approve ${business.name} yet`,
        paragraphs: parts.paragraphs,
        details: parts.details,
        action: { label: "Open your business profile", url: absoluteUrl(`/business/${business.id}/edit`) },
        footer: "You're getting this because you signed up a business on Promotello.",
        footerLinks: parts.footerLinks,
    });

    return { to, subject: `About ${business.name} on Promotello`, html, text };
}

type OfferForEmail = {
    id: string;
    title: string;
    slug: string;
    // The offer's own photograph, where it has one: this is an email
    // about that offer, and a picture of it is the quickest way to know
    // which one.
    imageUrl?: string | null;
    business: { id: string; name: string; logo_url?: string | null };
};

export function offerReviewedEmail(
    offer: OfferForEmail,
    decision: ReviewDecision,
    to: string,
    review?: Review,
    name?: string | null,
): Email {
    const mark = { name: offer.business.name, logoUrl: offer.business.logo_url };
    const hello = greeting(name);
    // The offer's own picture, on the two that are about it going live
    // or coming back. Not on a decline: a photograph of the thing we
    // just turned down reads as a taunt.
    const picture = offer.imageUrl ? { url: offer.imageUrl, alt: offer.title } : undefined;

    if (decision === "approved") {
        if (review?.previous === "suspended") {
            const { html, text } = brandedEmail({
                business: mark,
                picture,
                eyebrow: "Back up",
                title: `"${offer.title}" is back`,
                paragraphs: [
                    `${hello}It's on ${offer.business.name}'s page and in the offers directory again. Any poster or QR code printed for it works again too, without reprinting anything.`,
                    "Vouchers claimed before it came down were never cancelled, so anybody turning up with one is holding something real.",
                ],
                action: { label: "See your offer", url: absoluteUrl(`/offers/${offer.slug}`) },
                footer: `You're getting this because you manage ${offer.business.name} on Promotello.`,
            });

            return { to, subject: `Your offer is back: ${offer.title}`, html, text };
        }

        const { html, text } = brandedEmail({
            business: mark,
            picture,
            eyebrow: "Offer approved",
            title: `"${offer.title}" is live`,
            paragraphs: [
                `${hello}Customers can now see and claim it on ${offer.business.name}'s page and in the Promotello offers directory.`,
                "Mention it when you serve somebody, or put your QR poster up so passers-by can claim it too.",
            ],
            action: { label: "See your offer", url: absoluteUrl(`/offers/${offer.slug}`) },
            footer: `You're getting this because you manage ${offer.business.name} on Promotello.`,
        });

        return { to, subject: `Your offer is live: ${offer.title}`, html, text };
    }

    if (decision === "suspended") {
        const parts = declineParts(
            "offer",
            "suspended",
            review,
            `${hello}We've taken "${offer.title}" off the site for now, and this is why.`,
            "The rest of your page is untouched and still live. Vouchers people already claimed still work, so nobody is turned away at the counter over this. Reply to this email and we'll deal with it today.",
        );

        const { html, text } = brandedEmail({
            business: mark,
            eyebrow: "Offer taken down",
            title: `"${offer.title}" is off the site for now`,
            paragraphs: parts.paragraphs,
            details: parts.details,
            action: { label: "Edit this offer", url: absoluteUrl(`/business/${offer.business.id}/offers/${offer.id}/edit`) },
            footer: `You're getting this because you manage ${offer.business.name} on Promotello.`,
            footerLinks: parts.footerLinks,
        });

        return { to, subject: `Your offer is off the site: ${offer.title}`, html, text };
    }

    const parts = declineParts(
        "offer",
        "rejected",
        review,
        `${hello}We couldn't approve this offer as written, and this is why.`,
        "Editing it sends it straight back to us, and we answer the same day. Reply to this email if you'd rather we suggested the wording.",
    );

    const { html, text } = brandedEmail({
        business: mark,
        eyebrow: "Offer not approved",
        title: `"${offer.title}" wasn't approved`,
        paragraphs: parts.paragraphs,
        details: parts.details,
        action: { label: "Edit this offer", url: absoluteUrl(`/business/${offer.business.id}/offers/${offer.id}/edit`) },
        footer: `You're getting this because you manage ${offer.business.name} on Promotello.`,
        footerLinks: parts.footerLinks,
    });

    return { to, subject: `Your offer wasn't approved: ${offer.title}`, html, text };
}

// A business has arrived and started setting its page up. Nothing to do
// about it: it reaches the queue when the business sends it, which is the
// other email below.
export function newBusinessAlertEmail(
    business: { name: string; category: string | null; city: string | null },
    owner: string,
    claimedPreview: boolean,
): Email {
    const what = [business.category, business.city].filter(Boolean).join(", ");
    const { html, text } = brandedEmail({
        eyebrow: claimedPreview ? "Preview claimed" : "New sign-up",
        title: `${business.name} has started setting up`,
        paragraphs: [
            `${business.name}${what ? ` (${what})` : ""} ${claimedPreview ? "was claimed from its preview" : "just signed up"}. Nothing to approve yet — we hear from them again when they send the page for review.`,
            `Owner: ${owner}`,
        ],
        action: { label: "See it in admin", url: absoluteUrl("/admin/businesses") },
        footer: "Sent to the Promotello inbox for every new business.",
    });

    return { to: contactInbox, subject: `New business: ${business.name}`, html, text };
}

// And the one that needs answering: they have looked at the page and sent
// it. Whoever wrote it, this is the only way into the queue.
export function businessReadyAlertEmail(
    business: { name: string; category: string | null; city: string | null },
    owner: string,
    // A page we built and they claimed goes live the moment they send
    // it, so this one is news rather than a job (20270113090000).
    live = false,
): Email {
    const what = [business.category, business.city].filter(Boolean).join(", ");
    const { html, text } = brandedEmail({
        eyebrow: live ? "Live" : "Ready for review",
        title: live
            ? `${business.name} sent its page and went live`
            : `${business.name} is waiting for approval`,
        paragraphs: [
            live
                ? `${business.name}${what ? ` (${what})` : ""} claimed the page we built and has just sent it. It was already read when we built it, so it went straight onto the directory — nothing to approve. Worth a look to see what they changed.`
                : `${business.name}${what ? ` (${what})` : ""} has finished its page and sent it to us. It's hidden from customers until it's approved.`,
            `Owner: ${owner}`,
        ],
        action: { label: live ? "See the business" : "Review it", url: absoluteUrl("/admin/businesses") },
        footer: "Sent to the Promotello inbox when a business asks for a review.",
    });

    return {
        to: contactInbox,
        subject: live ? `Live: ${business.name}` : `Ready for review: ${business.name}`,
        html,
        text,
    };
}

export function newOfferAlertEmail(
    offer: { title: string; discount: string; business: string; businessApproved: boolean },
    submitter: string,
): Email {
    const { html, text } = brandedEmail({
        eyebrow: offer.businessApproved ? "Waiting for review" : "Waiting on the business",
        title: `${offer.business}: ${offer.title}`,
        paragraphs: [
            `${offer.discount}. It stays hidden from customers until it's approved.`,
            offer.businessApproved
                ? `From: ${submitter}`
                : `${offer.business} is itself still waiting for approval, and an offer can't go live before its business does — so start there. From: ${submitter}`,
        ],
        action: {
            label: offer.businessApproved ? "Review it" : "Review the business",
            url: absoluteUrl(offer.businessApproved ? "/admin/offers" : "/admin/businesses"),
        },
        footer: "Sent to the Promotello inbox for every offer waiting for review.",
    });

    return { to: contactInbox, subject: `Offer to review: ${offer.business} — ${offer.title}`, html, text };
}

// An offer reaches nobody until it is reviewed, so the inbox hears about
// each one — on a new offer, and on an edit that sends a live one back.
export async function alertNewOffer(offerId: string, submitter: string) {
    // Test sign-ups would otherwise reach the real inbox.
    if (!isDeliverable(submitter)) return { sent: 0 };

    const { data } = await createAdminClient()
        .from("offers")
        .select("title, discount, approval_status, businesses ( name, approval_status )")
        .eq("id", offerId)
        .maybeSingle();

    const business = Array.isArray(data?.businesses) ? data.businesses[0] : data?.businesses;

    if (!data || !business || data.approval_status !== "pending") return { sent: 0 };

    return sendEmails([
        newOfferAlertEmail(
            {
                title: data.title,
                discount: data.discount,
                business: business.name,
                businessApproved: business.approval_status === "approved",
            },
            submitter,
        ),
    ]);
}

export function offerEditAlertEmail(
    edit: { business: string; offer: string; was: string; now: string },
    submitter: string,
): Email {
    const { html, text } = brandedEmail({
        eyebrow: "Change waiting",
        title: `${edit.business} rewrote “${edit.offer}”`,
        paragraphs: [
            `Was: ${edit.was}`,
            `Now: ${edit.now}`,
            `The offer is still live with the old words until this is answered. From: ${submitter}`,
        ],
        action: { label: "Read the change", url: absoluteUrl("/admin/offers") },
        footer: "Sent to the Promotello inbox for every change waiting for review.",
    });

    return { to: contactInbox, subject: `Offer change: ${edit.business} — ${edit.offer}`, html, text };
}

// A change to a live offer waits in its own queue, so the offer stays up
// while we read it. Nothing else would tell us it is there.
export async function alertOfferEdit(offerId: string, submitter: string) {
    if (!isDeliverable(submitter)) return { sent: 0 };

    const admin = createAdminClient();

    const { data } = await admin
        .from("offer_edits")
        .select("title, discount, offers ( title, discount, businesses ( name ) )")
        .eq("offer_id", offerId)
        .is("decided_at", null)
        .maybeSingle();

    const offer = Array.isArray(data?.offers) ? data.offers[0] : data?.offers;
    const business = Array.isArray(offer?.businesses) ? offer.businesses[0] : offer?.businesses;

    if (!data || !offer || !business) return { sent: 0 };

    return sendEmails([
        offerEditAlertEmail(
            {
                business: business.name,
                offer: offer.title,
                was: `${offer.discount} — ${offer.title}`,
                now: `${data.discount} — ${data.title}`,
            },
            submitter,
        ),
    ]);
}

export function offerEditReviewedEmail(
    offer: { id: string; businessId: string; title: string; slug: string; business: string },
    decision: ReviewDecision,
    to: string,
    review?: Review,
): Email {
    if (decision === "approved") {
        const { html, text } = brandedEmail({
            eyebrow: "Change live",
            title: `Your changes to “${offer.title}” are live`,
            paragraphs: [
                "We've read the new wording and it's on your offer now. It never came off the site while we looked, so anything printed with its QR code kept working.",
            ],
            action: { label: "See the offer", url: absoluteUrl(`/offers/${offer.slug}`) },
            footer: "You're getting this because you run a business on Promotello.",
        });

        return { to, subject: `Your changes to ${offer.title} are live`, html, text };
    }

    const parts = declineParts(
        "offer",
        "rejected",
        review,
        `${offer.title} is still live with the wording we approved before, so nothing has stopped working. Here's what we couldn't approve in the new version.`,
        "Send it again whenever you're ready — the offer stays up the whole time. Reply to this email if you'd like a hand with the wording.",
    );

    const { html, text } = brandedEmail({
        eyebrow: "Change not approved",
        title: `We couldn't approve the new wording for “${offer.title}”`,
        paragraphs: parts.paragraphs,
        details: parts.details,
        action: { label: "Edit the offer", url: absoluteUrl(`/business/${offer.businessId}/offers/${offer.id}/edit`) },
        footer: "You're getting this because you run a business on Promotello.",
        footerLinks: parts.footerLinks,
    });

    return { to, subject: `A change to ${offer.title} needs another look`, html, text };
}

export async function emailOfferEditReviewed(editId: string, decision: ReviewDecision) {
    const admin = createAdminClient();

    const { data } = await admin
        .from("offer_edits")
        .select("offer_id, business_id, review_reason, review_note, offers ( title, slug, businesses ( name ) )")
        .eq("id", editId)
        .maybeSingle();

    const offer = Array.isArray(data?.offers) ? data.offers[0] : data?.offers;
    const business = Array.isArray(offer?.businesses) ? offer.businesses[0] : offer?.businesses;

    if (!data || !offer || !business) return { sent: 0 };

    const emails = await managerEmails(data.business_id);
    const review = { reason: data.review_reason, note: data.review_note };

    return sendEmails(
        emails.map((to) =>
            offerEditReviewedEmail(
                {
                    id: data.offer_id,
                    businessId: data.business_id,
                    title: offer.title,
                    slug: offer.slug,
                    business: business.name,
                },
                decision,
                to,
                review,
            ),
        ),
    );
}

async function managerEmails(businessId: string) {
    const { data } = await createAdminClient().rpc("business_manager_emails", { requested_business_id: businessId });
    return (data ?? []) as string[];
}

export async function emailBusinessReviewed(
    businessId: string,
    decision: ReviewDecision,
    previous?: string | null,
) {
    const { data: business } = await createAdminClient()
        .from("businesses")
        .select("id, name, slug, logo_url, review_reason, review_note")
        .eq("id", businessId)
        .maybeSingle();

    if (!business) return { sent: 0 };

    const review = { reason: business.review_reason, note: business.review_note, previous };
    const people = await businessRecipients(businessId);

    return sendEmails(
        people.map((person) => businessReviewedEmail(business, decision, person.email, review, person.name)),
    );
}

export async function emailOfferReviewed(
    offerId: string,
    decision: ReviewDecision,
    previous?: string | null,
) {
    const { data } = await createAdminClient()
        .from("offers")
        .select("id, title, slug, image_url, review_reason, review_note, businesses ( id, name, logo_url )")
        .eq("id", offerId)
        .maybeSingle();

    const business = Array.isArray(data?.businesses) ? data.businesses[0] : data?.businesses;

    if (!data || !business) return { sent: 0 };

    const offer = { id: data.id, title: data.title, slug: data.slug, imageUrl: data.image_url, business };
    const review = { reason: data.review_reason, note: data.review_note, previous };
    const people = await businessRecipients(business.id);

    return sendEmails(
        people.map((person) => offerReviewedEmail(offer, decision, person.email, review, person.name)),
    );
}

export async function alertNewBusiness(businessId: string, owner: string, claimedPreview = false) {
    return alertAbout(businessId, owner, (business) =>
        newBusinessAlertEmail(business, owner, claimedPreview),
    );
}

export async function alertBusinessReady(businessId: string, owner: string, live = false) {
    return alertAbout(businessId, owner, (business) => businessReadyAlertEmail(business, owner, live));
}

async function alertAbout(
    businessId: string,
    owner: string,
    email: (business: { name: string; category: string | null; city: string | null }) => Email,
) {
    // Test sign-ups would otherwise reach the real inbox.
    if (!isDeliverable(owner)) return { sent: 0 };

    const { data } = await createAdminClient()
        .from("businesses")
        .select("name, category, business_locations ( city )")
        .eq("id", businessId)
        .maybeSingle();

    if (!data) return { sent: 0 };

    return sendEmails([email({ name: data.name, category: data.category, city: data.business_locations?.[0]?.city ?? null })]);
}
