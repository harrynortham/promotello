"use server";

import { emailBusinessReviewed, type ReviewDecision } from "@/lib/business-review-emails";
import {
    businessApproved,
    businessRejected,
    businessRestored,
    businessSuspended,
} from "@/lib/notifications";
import { notifyBusinessManagers } from "@/lib/notify";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

// Called after an admin approves, rejects or suspends a business: tells
// its owners. `previous` is the status it came from, which the row no
// longer knows — approving a suspended business is a restoration, and
// nothing about it reads like a first approval.
export async function notifyBusinessReviewed(
    businessId: string,
    decision: ReviewDecision,
    previous?: string | null,
) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return { sent: 0 };
    }

    const { sent } = await emailBusinessReviewed(businessId, decision, previous);

    // Beside the email, not instead of it: somebody who turned the email
    // off still hears, and a failed send doesn't take this with it.
    const { data: business } = await createAdminClient()
        .from("businesses")
        .select("id, name, review_reason, review_note, updated_at")
        .eq("id", businessId)
        .maybeSingle();

    if (business) {
        // The reason comes off the row rather than from the browser:
        // review_business() has already checked there is one.
        const review = { reason: business.review_reason, note: business.review_note };

        // Suspensions and restorations are keyed on the moment, because
        // one business can go down and up more than once and must hear
        // about each time.
        const at = business.updated_at ?? new Date().toISOString();

        await notifyBusinessManagers(
            businessId,
            decision === "suspended"
                ? businessSuspended(business, at, review)
                : decision === "rejected"
                    ? businessRejected(business, review)
                    : previous === "suspended"
                        ? businessRestored(business, at)
                        : businessApproved(business),
        );
    }

    return { sent };
}
