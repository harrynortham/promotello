"use server";

import { sendLifecycleEmails } from "@/lib/business-lifecycle";
import { createClient } from "@/utils/supabase/server";

// Right after sign-up: sends the welcome email to the new business's owner.
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

    await sendLifecycleEmails(businessId);
}
