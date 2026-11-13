// What a notification says.
//
// The only place a notification's words are written, the way
// lib/offer-kinds.ts is the only place an offer's headline is built.
// Each builder returns the row's contents; lib/notify.ts puts them in
// the table and decides who gets them.
//
// The words are stored as written rather than rebuilt from the type on
// every read, so a notification about "Free pastry" still says that
// after the offer is renamed or deleted. That is why these are plain
// functions over plain values: nothing here reads the database.
//
// Copy follows the email that already goes out for the same event —
// plain British English, the business or the offer named, no exclamation
// marks, and no place names (docs/MULTI-CITY.md).
//
// Imports nothing from Next.js or Supabase, so it unit tests on its own
// (tests/unit/notifications.test.ts).

export type NotificationType =
    | "business_approved"
    | "business_rejected"
    | "offer_approved"
    | "offer_rejected"
    | "offer_edit_approved"
    | "offer_edit_rejected"
    | "offer_fully_claimed"
    | "offer_low_stock"
    | "new_offer_from_followed"
    | "voucher_issued"
    | "loyalty_card_issued"
    | "plan_ending";

export type NotificationContent = {
    type: NotificationType;
    title: string;
    body?: string;
    // Somewhere in this app. The table refuses anything else.
    href?: string;
    // Which of their businesses this is about. Context, never access.
    businessId?: string;
    // The same event must not tell somebody twice.
    dedupeKey?: string;
};

type Business = { id: string; name: string };
type Offer = { id: string; title: string; slug: string; businessId: string };

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export function businessApproved(business: Business): NotificationContent {
    return {
        type: "business_approved",
        title: `${business.name} is live on Promotello`,
        body: "Customers can find your page now. Add an offer to give them a reason to come in.",
        href: `/business/${business.id}`,
        businessId: business.id,
        dedupeKey: `business:${business.id}:approved`,
    };
}

export function businessRejected(business: Business): NotificationContent {
    return {
        type: "business_rejected",
        title: `We couldn't approve ${business.name} yet`,
        body: "We've emailed you what needs changing. Reply to that email if anything is unclear.",
        href: "/business/contact",
        businessId: business.id,
        dedupeKey: `business:${business.id}:rejected`,
    };
}

export function offerApproved(offer: Offer): NotificationContent {
    return {
        type: "offer_approved",
        title: `“${offer.title}” is live`,
        body: "Customers can claim it now, and your followers are hearing about it.",
        href: `/business/${offer.businessId}/offers`,
        businessId: offer.businessId,
        dedupeKey: `offer:${offer.id}:approved`,
    };
}

export function offerRejected(offer: Offer): NotificationContent {
    return {
        type: "offer_rejected",
        title: `“${offer.title}” wasn't approved`,
        body: "We've emailed you why. Change it and send it back whenever you're ready.",
        href: `/business/${offer.businessId}/offers`,
        businessId: offer.businessId,
        dedupeKey: `offer:${offer.id}:rejected`,
    };
}

// An edit to a live offer is reviewed on its own, so the offer never
// leaves the site (docs/OFFER-EDIT-REVIEW.md).
export function offerEditApproved(edit: { id: string; offerTitle: string; businessId: string }): NotificationContent {
    return {
        type: "offer_edit_approved",
        title: `Your changes to “${edit.offerTitle}” are live`,
        body: "It never came off the site while we looked, so anything printed with its QR code kept working.",
        href: `/business/${edit.businessId}/offers`,
        businessId: edit.businessId,
        dedupeKey: `offer-edit:${edit.id}`,
    };
}

export function offerEditRejected(edit: { id: string; offerTitle: string; businessId: string }): NotificationContent {
    return {
        type: "offer_edit_rejected",
        title: `We couldn't approve the new wording for “${edit.offerTitle}”`,
        body: "The offer is still live with the words we approved. We've emailed you what to change.",
        href: `/business/${edit.businessId}/offers`,
        businessId: edit.businessId,
        dedupeKey: `offer-edit:${edit.id}`,
    };
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

export function offerFullyClaimed(offer: {
    id: string;
    title: string;
    businessId: string;
    maxRedemptions: number;
}): NotificationContent {
    return {
        type: "offer_fully_claimed",
        title: `All ${offer.maxRedemptions} of “${offer.title}” have been claimed`,
        body: "Nobody else can claim it. Anyone holding a voucher can still use it until it expires.",
        href: `/business/${offer.businessId}/offers`,
        businessId: offer.businessId,
        dedupeKey: `offer:${offer.id}:offer_fully_claimed`,
    };
}

export function offerLowStock(offer: {
    id: string;
    title: string;
    businessId: string;
    remaining: number;
}): NotificationContent {
    return {
        type: "offer_low_stock",
        title: `Only ${offer.remaining === 1 ? "1 claim" : `${offer.remaining} claims`} left on “${offer.title}”`,
        body: "Raise the limit if you'd like more people to have it, or let it run out.",
        href: `/business/${offer.businessId}/offers`,
        businessId: offer.businessId,
        dedupeKey: `offer:${offer.id}:offer_low_stock`,
    };
}

// A plan ending, said in the app as well as by email: the people who
// run a business are not all the person whose card Stripe has
// (lib/plan-ending.ts).
export function planEnding(plan: {
    businessId: string;
    businessName: string;
    ends: string | null;
    stopping: number;
}): NotificationContent {
    return {
        type: "plan_ending",
        title: plan.ends
            ? `${plan.businessName}'s plan ends on ${plan.ends}`
            : `${plan.businessName}'s plan has ended`,
        body: `${plan.stopping === 1 ? "One thing" : `${plan.stopping} things`} change, and your stamp card is not one of them. We've emailed you the lot.`,
        href: `/business/${plan.businessId}/billing`,
        businessId: plan.businessId,
        dedupeKey: `plan-ending:${plan.businessId}`,
    };
}

// ---------------------------------------------------------------------------
// The customer's side
// ---------------------------------------------------------------------------

export function newOfferFromFollowed(offer: {
    id: string;
    title: string;
    slug: string;
    discount: string;
    businessName: string;
}): NotificationContent {
    return {
        type: "new_offer_from_followed",
        title: `${offer.businessName}: ${offer.discount}`,
        body: offer.title,
        href: `/offers/${offer.slug}`,
        dedupeKey: `new-offer:${offer.id}`,
    };
}

// A reward voucher from an automation — a welcome, a birthday, a nudge
// to come back. The voucher is theirs; it is in the wallet already.
export function voucherIssued(voucher: {
    id: string;
    reward: string;
    businessName: string;
}): NotificationContent {
    return {
        type: "voucher_issued",
        title: `${voucher.businessName} sent you ${voucher.reward}`,
        body: "It's in your vouchers. Show the code when you're there.",
        href: "/dashboard/redemptions",
        dedupeKey: `voucher:${voucher.id}`,
    };
}

// The card a business ran has ended, and the customer filled theirs just
// as it did. The new one is already in their wallet — this is them being
// told, not being asked.
export function newLoyaltyCard(card: {
    id: string;
    programId: string;
    stampsRequired: number;
    reward: string;
    businessName: string;
}): NotificationContent {
    const reward = card.reward.trim();

    return {
        type: "loyalty_card_issued",
        title: `${card.businessName} has a new card: ${card.stampsRequired} stamps for ${
            reward.charAt(0).toLowerCase() + reward.slice(1)
        }`,
        body: "It's in your loyalty cards, with your next stamp waiting to go on it.",
        href: `/loyalty/${card.programId}`,
        dedupeKey: `loyalty-card:${card.id}`,
    };
}
