import { offersPaused, paymentFailed } from "@/lib/notifications";
import { notifyBusinessManagers } from "@/lib/notify";
import { createAdminClient } from "@/utils/supabase/admin";

// The two things a subscription does to a business that it would
// otherwise find out about by accident.
//
// Both are sent from the Stripe webhook, which fires on every
// subscription event there is, so both lean on the notification dedupe
// key rather than on being called carefully. Neither throws: the
// subscription is already saved by the time these run, and a webhook
// that fails is a webhook Stripe sends again.

// A card that was declined. Stripe retries for a while before anything
// actually stops, which is exactly the window this is for.
export async function tellThemThePaymentFailed(businessId: string) {
    try {
        const admin = createAdminClient();

        const { data: business } = await admin
            .from("businesses")
            .select("id, name")
            .eq("id", businessId)
            .maybeSingle();

        if (!business) return { told: 0 };

        const { sent } = await notifyBusinessManagers(businessId, paymentFailed(business));

        return { told: sent };
    } catch (error) {
        console.error("Could not say that a payment failed", error);
        return { told: 0 };
    }
}

// Dropping to Free takes every offer but the newest off the directory
// (apply_business_plan). The pausing is the database's; being told is
// not, and until now nobody was.
export async function tellThemTheirOffersArePaused(businessId: string) {
    try {
        const admin = createAdminClient();

        const { count } = await admin
            .from("offers")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .not("plan_paused_at", "is", null);

        if (!count) return { told: 0 };

        const { sent } = await notifyBusinessManagers(
            businessId,
            offersPaused({ businessId, paused: count }),
        );

        return { told: sent };
    } catch (error) {
        console.error("Could not say that offers were paused", error);
        return { told: 0 };
    }
}
