"use server";

import { announceNewBusiness, ownsBusiness } from "@/lib/new-business";
import { createClient } from "@/utils/supabase/server";

// Right after sign-up: the welcome email, and a line in the Promotello
// inbox saying a business has started setting up. Claiming a page we built
// does the same thing through the same function (lib/new-business), so
// there is one answer to "what happens when a business arrives".
export async function welcomeNewBusiness(businessId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await ownsBusiness(supabase, businessId, user.id))) return;

    await announceNewBusiness(businessId, user.email, { claimedPreview: false });
}
