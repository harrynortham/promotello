"use server";

import { emailFollowersAboutOffer } from "@/lib/new-offer-email";
import { createClient } from "@/utils/supabase/server";

// After creating an offer: Pro businesses' offers are approved on insert, so
// email followers straight away. Others wait for an admin to approve.
export async function announceNewOffer(offerId: string) {
    const supabase = await createClient();

    // RLS: only members of the offer's business can read it here.
    const { data: offer } = await supabase
        .from("offers")
        .select("approval_status")
        .eq("id", offerId)
        .maybeSingle();

    if (offer?.approval_status !== "approved") {
        return { live: false, emailed: 0 };
    }

    const { sent } = await emailFollowersAboutOffer(offerId);
    return { live: true, emailed: sent };
}
