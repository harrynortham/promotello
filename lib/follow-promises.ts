import type { FollowPromises } from "@/lib/follow-reasons";
import { businessTier } from "@/lib/billing";
import { createAdminClient } from "@/utils/supabase/admin";

// What a business can actually promise somebody who follows it.
//
// Read with the service role because one of the two callers is the page
// a customer lands on after scanning a poster, and a customer is not a
// member of the business: business_automations is readable by its own
// team and nobody else. Nothing about the plan leaves here -- only
// three booleans about what will happen to the person reading.
export async function followPromises(businessId: string): Promise<FollowPromises> {
    const admin = createAdminClient();

    const [tier, { data: automations }] = await Promise.all([
        businessTier(admin, businessId).catch(() => "free" as const),
        admin
            .from("business_automations")
            .select("kind, enabled")
            .eq("business_id", businessId),
    ]);

    // Switched on is not enough: without Growth the issuing function
    // never looks at this business, so the row says "on" and nothing
    // goes out.
    const on = (kind: string) =>
        tier === "growth" && Boolean((automations ?? []).find((row) => row.kind === kind)?.enabled);

    return {
        // claim_new_offer_email_recipients checks business_has_pro, so
        // on Free a follower hears nothing when an offer goes up.
        emailsOffers: tier === "pro" || tier === "growth",
        welcome: on("welcome"),
        birthday: on("birthday"),
    };
}
