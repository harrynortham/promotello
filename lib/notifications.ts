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
    | "offers_paused"
    | "offer_expiring"
    | "payment_failed"
    | "poster_pointing_nowhere"
    | "reward_ready"
    | "voucher_expiring"
    | "followed_business_closed"
    | "admin_queue"
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
// The plan, and what it was holding up
// ---------------------------------------------------------------------------

// A downgrade takes every offer but the newest off the directory
// (apply_business_plan), and until this it happened without a word.
export function offersPaused(plan: {
    businessId: string;
    paused: number;
}): NotificationContent {
    return {
        type: "offers_paused",
        title:
            plan.paused === 1
                ? "An offer has come off the directory"
                : `${plan.paused} offers have come off the directory`,
        body: "Free keeps your newest offer live and pauses the rest. They go back up the moment you're on a paid plan again — nothing is deleted.",
        href: `/business/${plan.businessId}/billing`,
        businessId: plan.businessId,
        // Per downgrade, not per offer: one line, not four.
        dedupeKey: `offers-paused:${plan.businessId}:${plan.paused}`,
    };
}

export function paymentFailed(business: Business): NotificationContent {
    return {
        type: "payment_failed",
        title: `We couldn't take the payment for ${business.name}`,
        body: "Your card was declined. Update it in billing and we'll try again — nothing stops while there's still time.",
        href: `/business/${business.id}/billing`,
        businessId: business.id,
        dedupeKey: `payment-failed:${business.id}`,
    };
}

// ---------------------------------------------------------------------------
// Things running out
// ---------------------------------------------------------------------------

export function offerExpiring(offer: {
    id: string;
    title: string;
    businessId: string;
    days: number;
}): NotificationContent {
    return {
        type: "offer_expiring",
        title:
            offer.days <= 1
                ? `“${offer.title}” ends tomorrow`
                : `“${offer.title}” ends in ${offer.days} days`,
        body: "Give it longer, or let it finish and write the next one. Anything already claimed can still be used.",
        href: `/business/${offer.businessId}/offers`,
        businessId: offer.businessId,
        dedupeKey: `offer-expiring:${offer.id}`,
    };
}

// A sheet in a window outlives the offer it was printed for. The scan
// never dead-ends — it falls back to the business page — but the
// business is the only one who can put it right (lib/qr-target.ts).
export function posterPointingNowhere(poster: {
    id: string;
    label: string;
    businessId: string;
    problem: string;
}): NotificationContent {
    return {
        type: "poster_pointing_nowhere",
        title: `The poster “${poster.label}” is advertising something that has ended`,
        body: `${poster.problem} Whoever scans it lands on your page instead. Print a new one, or take it down.`,
        href: `/business/${poster.businessId}/qr`,
        businessId: poster.businessId,
        dedupeKey: `poster-nowhere:${poster.id}`,
    };
}

// ---------------------------------------------------------------------------
// The customer's side
// ---------------------------------------------------------------------------

export function rewardReady(card: {
    id: string;
    programId: string;
    businessName: string;
    reward: string;
    // An open card fills again and again, and each round is its own
    // reward: the count of rewards already claimed keeps the second one
    // from being read as a repeat of the first.
    round: number;
}): NotificationContent {
    const reward = card.reward.trim();

    return {
        type: "reward_ready",
        title: `Your card at ${card.businessName} is full`,
        body: `Ask for ${reward.charAt(0).toLowerCase() + reward.slice(1)} next time you're in. Show them the card and they'll do the rest.`,
        href: `/loyalty/${card.programId}`,
        dedupeKey: `reward-ready:${card.id}:${card.round}`,
    };
}

export function voucherExpiring(voucher: {
    id: string;
    offerTitle: string;
    offerSlug: string;
    businessName: string;
}): NotificationContent {
    return {
        type: "voucher_expiring",
        title: `Your voucher at ${voucher.businessName} runs out tomorrow`,
        body: `“${voucher.offerTitle}” — today or tomorrow is the last of it.`,
        href: `/offers/${voucher.offerSlug}`,
        dedupeKey: `voucher-expiring:${voucher.id}`,
    };
}

export function followedBusinessClosed(business: Business): NotificationContent {
    return {
        type: "followed_business_closed",
        title: `${business.name} has left Promotello`,
        body: "Anything you were holding for them won't be honoured here any more. Worth checking before you make the trip.",
        href: "/dashboard",
        dedupeKey: `business-closed:${business.id}`,
    };
}

// ---------------------------------------------------------------------------
// Ours
// ---------------------------------------------------------------------------

// Four queues that only ever spoke when somebody went looking. One line
// a day, with the counts, and only when there is something in them.
export function adminQueue(waiting: {
    day: string;
    businesses: number;
    offers: number;
    edits: number;
    categories: number;
}): NotificationContent {
    const parts = [
        waiting.businesses > 0 ? `${waiting.businesses} business${waiting.businesses === 1 ? "" : "es"} to review` : null,
        waiting.offers > 0 ? `${waiting.offers} offer${waiting.offers === 1 ? "" : "s"} to review` : null,
        waiting.edits > 0 ? `${waiting.edits} edit${waiting.edits === 1 ? "" : "s"} to read` : null,
        waiting.categories > 0 ? `${waiting.categories} without a category` : null,
    ].filter(Boolean);

    const total = waiting.businesses + waiting.offers + waiting.edits + waiting.categories;

    return {
        type: "admin_queue",
        title: total === 1 ? "One thing is waiting for you" : `${total} things are waiting for you`,
        body: parts.join(", ") + ".",
        href: "/admin",
        dedupeKey: `admin-queue:${waiting.day}`,
    };
}

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
