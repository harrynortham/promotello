"use server";

import { emailOfferReviewed, type ReviewDecision } from "@/lib/business-review-emails";
import { emailFollowersAboutOffer } from "@/lib/new-offer-email";
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
