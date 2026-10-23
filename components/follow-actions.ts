"use server";

import { runAutomations } from "@/lib/automations";
import { createClient } from "@/utils/supabase/server";

// Right after following: sends the business's welcome reward, if it has one.
export async function welcomeNewFollower(businessId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await runAutomations({ businessId, userId: user.id });
}
