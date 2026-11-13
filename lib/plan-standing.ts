import type { SupabaseClient } from "@supabase/supabase-js";

import type { Standing } from "@/lib/plan-loss";

// Where a business stands today, in the five numbers that decide what
// cancelling costs it (lib/plan-loss.ts).
//
// One place, because two things ask: the page in front of the Stripe
// portal, reading as the person who is about to cancel, and the email
// that goes out when the cancellation lands, reading with the service
// role. Counted the same way both times, or the email contradicts the
// page they just read.
export async function loadStanding(
    supabase: SupabaseClient,
    businessId: string,
    tier: Standing["tier"],
): Promise<Standing> {
    const today = new Date().toISOString().slice(0, 10);

    const [{ count: liveOffers }, { count: posters }, { count: followers }, { data: programs }, { data: automations }] =
        await Promise.all([
            // Live is what a customer can see: approved, unexpired, and
            // not paused by a plan it has outgrown.
            supabase
                .from("offers")
                .select("id", { count: "exact", head: true })
                .eq("business_id", businessId)
                .eq("approval_status", "approved")
                .gte("expires_at", today)
                .is("plan_paused_at", null),
            supabase
                .from("qr_codes")
                .select("id", { count: "exact", head: true })
                .eq("business_id", businessId)
                .is("archived_at", null),
            supabase
                .from("business_followers")
                .select("user_id", { count: "exact", head: true })
                .eq("business_id", businessId),
            supabase
                .from("loyalty_programs")
                .select("id")
                .eq("business_id", businessId)
                .eq("is_active", true)
                .is("closed_at", null),
            supabase
                .from("business_automations")
                .select("kind")
                .eq("business_id", businessId)
                .eq("enabled", true),
        ]);

    const programIds = (programs ?? []).map((program) => program.id as string);

    // Somebody still collecting, not somebody who finished a card and
    // walked away.
    const { count: cardHolders } = programIds.length
        ? await supabase
              .from("loyalty_cards")
              .select("id", { count: "exact", head: true })
              .in("program_id", programIds)
              .is("finished_at", null)
        : { count: 0 };

    return {
        tier,
        liveOffers: liveOffers ?? 0,
        posters: posters ?? 0,
        followers: followers ?? 0,
        cardHolders: cardHolders ?? 0,
        hasCard: programIds.length > 0,
        automationsOn: automations?.length ?? 0,
    };
}
