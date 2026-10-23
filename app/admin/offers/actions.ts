"use server";

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
