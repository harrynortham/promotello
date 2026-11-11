"use server";

import {
    emailOfferEditReviewed,
    emailOfferReviewed,
    type ReviewDecision,
} from "@/lib/business-review-emails";
import { emailFollowersAboutOffer } from "@/lib/new-offer-email";
import {
    offerApproved,
    offerEditApproved,
    offerEditRejected,
    offerRejected,
} from "@/lib/notifications";
import { notifyBusinessManagers } from "@/lib/notify";
import { ITEM_MAX, isOfferKind, kindTakes, offerHeadline } from "@/lib/offer-kinds";
import { availabilityLine, availabilityParts } from "@/lib/schedule";
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

    const { data: offer } = await createAdminClient()
        .from("offers")
        .select("id, title, slug, business_id")
        .eq("id", offerId)
        .maybeSingle();

    if (offer) {
        const content = { id: offer.id, title: offer.title, slug: offer.slug, businessId: offer.business_id };

        await notifyBusinessManagers(
            offer.business_id,
            decision === "approved" ? offerApproved(content) : offerRejected(content),
        );
    }

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

    const { data: edit } = await createAdminClient()
        .from("offer_edits")
        .select("id, business_id, offers ( title )")
        .eq("id", editId)
        .maybeSingle();

    const edited = Array.isArray(edit?.offers) ? edit.offers[0] : edit?.offers;

    if (edit && edited) {
        const content = { id: edit.id, offerTitle: edited.title, businessId: edit.business_id };

        await notifyBusinessManagers(
            edit.business_id,
            decision === "approved" ? offerEditApproved(content) : offerEditRejected(content),
        );
    }

    return { sent };
}

// Putting an offer's type and availability right by hand, from
// /admin/offers/[offerId]. This is how the backfills' leftovers — the
// headlines and the availability lines the rules couldn't read — get a
// type that joins the customer's filter and a line like every other.
//
// Written through admin_correct_offer(), with the admin's own session
// rather than the service key: there is no update policy on offers for
// platform admins, but the service key has no auth.uid(), so the review
// trigger couldn't see an admin and corrected offers went back to
// 'pending' — off the site until somebody re-approved them.
//
// Both lines are rebuilt here from the answers rather than taken from
// the browser, so they can only ever be what lib/offer-kinds.ts and
// lib/schedule.ts would write.
export async function correctOffer(
    offerId: string,
    values: {
        kind: string;
        kindValue: string;
        kindQuantity: string;
        kindItem: string;
        discount: string;
        when: string;
        availableDays: number[];
        availableFrom: string;
        availableUntil: string;
        audience: string;
    },
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

    const parts = availabilityParts(values);
    const availability = availabilityLine(parts);

    // Anything this type doesn't use is cleared, so correcting a type
    // never leaves the number from the last one behind. The same goes
    // for the days and times when the answer goes back to "any time".
    //
    // schedule_days/start/end are not touched: whether staff are held to
    // the window is the business's to ask for, on its own plan.
    const { error } = await supabase.rpc("admin_correct_offer", {
        requested_offer_id: offerId,
        new_kind: kind,
        new_kind_value: kindTakes(kind, "value") ? value : null,
        new_kind_quantity: kindTakes(kind, "quantity") ? quantity : null,
        new_kind_item: kindTakes(kind, "item") ? item : null,
        new_discount: discount,
        new_availability: availability,
        new_available_days: parts.days,
        new_available_from: parts.from,
        new_available_until: parts.until,
        new_audience: parts.audience,
    });

    if (error) {
        return { error: error.message };
    }

    return { discount, availability };
}
