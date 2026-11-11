"use server";

import {
    emailOfferEditReviewed,
    emailOfferReviewed,
    type ReviewDecision,
} from "@/lib/business-review-emails";
import { emailFollowersAboutOffer } from "@/lib/new-offer-email";
import { ITEM_MAX, isOfferKind, kindTakes, offerHeadline } from "@/lib/offer-kinds";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

// Called after an admin approves an offer: emails the business's followers.
export async function notifyFollowersOfApprovedOffer(offerId: string) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return { sent: 0 };
    }

    const { sent } = await emailFollowersAboutOffer(offerId);
    return { sent };
}

// Called after an admin approves or rejects an offer: tells the business.
export async function notifyBusinessOfOfferReview(offerId: string, decision: ReviewDecision) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return { sent: 0 };
    }

    const { sent } = await emailOfferReviewed(offerId, decision);
    return { sent };
}

// Called after an admin answers a change to a live offer.
export async function notifyBusinessOfOfferEditReview(editId: string, decision: ReviewDecision) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return { sent: 0 };
    }

    const { sent } = await emailOfferEditReviewed(editId, decision);
    return { sent };
}

// Setting an offer's type by hand, from /admin/offers/[offerId]. This is
// how the backfill's leftovers — the headlines the rules couldn't read —
// get a real type and join the customer's type filter.
//
// Written with the service key: an admin has row-level access to read
// every offer but not to write another business's, the same reason that
// page reads with it. The caller is checked against is_platform_admin()
// with their own session first.
//
// The headline is rebuilt here from the type rather than taken from the
// browser, so it can only ever be what lib/offer-kinds.ts would write.
export async function correctOfferKind(
    offerId: string,
    values: { kind: string; kindValue: string; kindQuantity: string; kindItem: string; discount: string },
) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return { error: "Platform administrator access is required." };
    }

    if (!isOfferKind(values.kind)) {
        return { error: "Choose a type of offer." };
    }

    const kind = values.kind;
    const item = values.kindItem.trim().slice(0, ITEM_MAX) || null;
    const value = values.kindValue.trim() === "" ? null : Number(values.kindValue);
    const quantity = values.kindQuantity.trim() === "" ? null : Number(values.kindQuantity);
    const discount = offerHeadline({ kind, value, quantity, item, text: values.discount });

    // Half a type is no headline at all, and an offer without one has
    // nothing for a card to print.
    if (!discount) {
        return { error: "Fill in what this type needs before saving it." };
    }

    // Anything this type doesn't use is cleared, so correcting a type
    // never leaves the number from the last one behind.
    const { error } = await createAdminClient()
        .from("offers")
        .update({
            kind,
            kind_value: kindTakes(kind, "value") ? value : null,
            kind_quantity: kindTakes(kind, "quantity") ? quantity : null,
            kind_item: kindTakes(kind, "item") ? item : null,
            discount,
        })
        .eq("id", offerId);

    if (error) {
        return { error: error.message };
    }

    return { discount };
}
