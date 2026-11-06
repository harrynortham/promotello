"use server";

import { alertNewOffer } from "@/lib/business-review-emails";
import { createClient } from "@/utils/supabase/server";

// Tells us an offer is waiting. Called when one is created, and when an
// edit sends a live one back for review — an offer reaches nobody until
// someone looks at it, and nothing else was saying so.
export async function offerWaitingForReview(offerId: string) {
    const supabase = await createClient();

    const [{ data: { user } }, { data: offer }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("offers").select("business_id").eq("id", offerId).maybeSingle(),
    ]);

    if (!user?.email || !offer) return { alerted: false };

    // Only the business's own people can put an offer in the queue, so
    // only they can make us an email about one.
    const { data: canManage } = await supabase.rpc("is_business_member", {
        requested_business_id: offer.business_id,
        minimum_role: "admin",
    });

    if (!canManage) return { alerted: false };

    const { sent } = await alertNewOffer(offerId, user.email);
    return { alerted: sent > 0 };
}
