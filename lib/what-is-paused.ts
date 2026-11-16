import type { SupabaseClient } from "@supabase/supabase-js";

export type WhatIsPaused = {
    pausedOffers: number;
    // People holding a card. They keep collecting on Free; what stops is
    // anybody new joining
    // (20270120090000_a_card_on_free_takes_no_new_members.sql).
    cardHolders: number;
    followers: number;
};

// What a business on Free is not getting, in its own numbers.
//
// Counted only for a business that had a plan and lost it, so nothing
// here runs for anybody else. Deliberately not loadStanding: that one
// answers "what would cancelling cost me", reading as somebody who
// still has a plan, and counts the offers a customer can see. This one
// counts the ones they cannot.
export async function loadWhatIsPaused(
    supabase: SupabaseClient,
    businessId: string,
): Promise<WhatIsPaused> {
    const [{ count: pausedOffers }, { count: followers }, { data: programs }] = await Promise.all([
        supabase
            .from("offers")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .not("plan_paused_at", "is", null),
        supabase
            .from("business_followers")
            .select("user_id", { count: "exact", head: true })
            .eq("business_id", businessId),
        supabase.from("loyalty_programs").select("id").eq("business_id", businessId),
    ]);

    const programIds = (programs ?? []).map((program) => program.id as string);

    // Everyone holding a card, on a closed programme as well as a live
    // one: a card nobody can join any more is still in somebody's phone.
    const { count: cardHolders } = programIds.length
        ? await supabase
              .from("loyalty_cards")
              .select("id", { count: "exact", head: true })
              .in("program_id", programIds)
        : { count: 0 };

    return {
        pausedOffers: pausedOffers ?? 0,
        cardHolders: cardHolders ?? 0,
        followers: followers ?? 0,
    };
}
