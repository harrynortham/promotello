"use server";

import { emailBusinessReviewed, type ReviewDecision } from "@/lib/business-review-emails";
import { businessApproved, businessRejected } from "@/lib/notifications";
import { notifyBusinessManagers } from "@/lib/notify";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

// Called after an admin approves or rejects a business: tells its owners.
export async function notifyBusinessReviewed(businessId: string, decision: ReviewDecision) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return { sent: 0 };
    }

    const { sent } = await emailBusinessReviewed(businessId, decision);

    // Beside the email, not instead of it: somebody who turned the email
    // off still hears, and a failed send doesn't take this with it.
    const { data: business } = await createAdminClient()
        .from("businesses")
        .select("id, name")
        .eq("id", businessId)
        .maybeSingle();

    if (business) {
        await notifyBusinessManagers(
            businessId,
            decision === "approved" ? businessApproved(business) : businessRejected(business),
        );
    }

    return { sent };
}
