import type { SupabaseClient } from "@supabase/supabase-js";

import { announceNewBusiness } from "@/lib/new-business";

// Becoming the owner of a page we built. It happens two ways — pressing
// Claim while signed in, or signing in after pressing it — and both have
// to do the same three things, or a business that took the second route
// never gets its welcome and nobody here hears it arrived.
//
// Returns the business, or null with the reason.
export async function claimPreview(supabase: SupabaseClient, token: string, email?: string | null) {
    const { data, error } = await supabase.rpc("claim_business_preview", { requested_token: token });

    const businessId = typeof data === "string" ? data : null;

    if (error || !businessId) {
        return { businessId: null, error: error?.message ?? "We couldn't claim this business." };
    }

    // Already claimed by them returns the same business, and the welcome is
    // only ever claimed once, so arriving twice sends nothing twice.
    await announceNewBusiness(businessId, email, { claimedPreview: true });

    return { businessId, error: null };
}
