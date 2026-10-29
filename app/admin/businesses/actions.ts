"use server";

import { emailBusinessReviewed, type ReviewDecision } from "@/lib/business-review-emails";
import { createClient } from "@/utils/supabase/server";

// Called after an admin approves or rejects a business: tells its owners.
export async function notifyBusinessReviewed(businessId: string, decision: ReviewDecision) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return { sent: 0 };
    }

    const { sent } = await emailBusinessReviewed(businessId, decision);
    return { sent };
}
