"use server";

import { sendLifecycleEmails } from "@/lib/business-lifecycle";
import { alertNewBusiness } from "@/lib/business-review-emails";
import { createClient } from "@/utils/supabase/server";

// Right after sign-up: sends the welcome email to the new business's owner
// and tells the Promotello inbox there's a business to approve.
export async function welcomeNewBusiness(businessId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .eq("role", "owner")
        .maybeSingle();

    if (!membership) return;

    // The welcome is only ever claimed once, so neither email repeats if
    // this is called again.
    const { due } = await sendLifecycleEmails(businessId);

    if (due > 0 && user.email) {
        await alertNewBusiness(businessId, user.email);
    }
}
