"use server";

import { emailFollowersAboutOffer } from "@/lib/new-offer-email";
import { createClient } from "@/utils/supabase/server";

// After creating an offer: Pro businesses' offers are approved on insert, so
// email followers straight away. Others wait for an admin to approve.
export async function announceNewOffer(offerId: string) {
    const supabase = await createClient();

    const { data: offer } = await supabase
        .from("offers")
        .select("approval_status, business_id")
        .eq("id", offerId)
        .maybeSingle();

    if (offer?.approval_status !== "approved") {
        return { live: false, emailed: 0 };
    }

    // Approved offers are public, so check the caller runs this business
    // before emailing its followers.
    const { data: canManage } = await supabase.rpc("is_business_member", {
        requested_business_id: offer.business_id,
        minimum_role: "admin",
    });

    if (!canManage) {
        return { live: true, emailed: 0 };
    }

    const { sent } = await emailFollowersAboutOffer(offerId);
    return { live: true, emailed: sent };
}
