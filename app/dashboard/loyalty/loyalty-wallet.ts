import { redirect } from "next/navigation";

import { groupCards } from "@/lib/loyalty-state";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";

import { getLoyaltyCards } from "./cards";

// Everything the wallet pages need: who is asking, their cards in the
// three groups, and how many are in each.
export async function getGroupedCards(next: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(next)}`);
    }

    // Cards they joined as a guest with this email become theirs here. It
    // is safe to call every time: there is usually nothing to claim.
    await supabase.rpc("claim_guest_loyalty_cards");

    const [cards, origin] = await Promise.all([getLoyaltyCards(user.id), requestOrigin()]);
    const groups = groupCards(cards);

    return {
        userId: user.id,
        origin,
        total: cards.length,
        cards,
        groups,
        counts: {
            ready: groups.ready.length,
            collecting: groups.collecting.length,
            finished: groups.finished.length,
        },
    };
}
