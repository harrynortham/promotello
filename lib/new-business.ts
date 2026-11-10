import type { SupabaseClient } from "@supabase/supabase-js";

import { sendLifecycleEmails } from "@/lib/business-lifecycle";
import { alertNewBusiness } from "@/lib/business-review-emails";

// A business arrives two ways: somebody signs up, or somebody claims a page
// we built them. From here on nothing cares which — the same welcome, the
// same line in the Promotello inbox, the same page to finish and send.
//
// The welcome is only ever claimed once, so calling this twice sends
// nothing twice.
export async function announceNewBusiness(
    businessId: string,
    ownerEmail: string | null | undefined,
    { claimedPreview }: { claimedPreview: boolean },
) {
    const { due } = await sendLifecycleEmails(businessId).catch(() => ({ due: 0 }));

    if (due > 0 && ownerEmail) {
        await alertNewBusiness(businessId, ownerEmail, claimedPreview).catch(() => undefined);
    }

    return { due };
}

// Whether this account can set the business up: the same check both ways in.
export async function ownsBusiness(supabase: SupabaseClient, businessId: string, userId: string) {
    const { data } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .eq("role", "owner")
        .maybeSingle();

    return Boolean(data);
}
