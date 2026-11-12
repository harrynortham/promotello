import { liveCardsFirst } from "@/lib/loyalty-state";
import { createClient } from "@/utils/supabase/server";

// The signed-in customer's loyalty cards, newest first. Shared by the
// loyalty cards page and the dashboard.

type CardRow = {
    id: string;
    card_code: string;
    stamps: number;
    rewards_redeemed: number;
    finished_at: string | null;
    loyalty_programs: {
        id: string;
        closed_at: string | null;
        stamps_required: number;
        reward: string;
        terms: string | null;
        card_colour: string | null;
        card_header: string | null;
        card_accent: string | null;
        stamp_icon: string | null;
        is_active: boolean;
        businesses: CardBusiness | CardBusiness[] | null;
    } | null;
};

type CardBusiness = { id: string; slug: string; name: string; logo_url: string | null };

export type CustomerLoyaltyCard = {
    id: string;
    code: string;
    stamps: number;
    rewardsRedeemed: number;
    programId: string;
    stampsRequired: number;
    reward: string;
    terms: string | null;
    cardColour: string | null;
    // The business's own two colours, where cardColour is "custom".
    cardHeader: string | null;
    cardAccent: string | null;
    stampIcon: string | null;
    active: boolean;
    rewardReady: boolean;
    // The business has stopped handing this card out: it fills once,
    // pays out once and is finished
    // (20261226090000_a_closed_card_gets_one_last_lap.sql).
    closed: boolean;
    finished: boolean;
    // The card they hold now at the same business, where the closed one
    // has been handed over.
    newCardProgramId: string | null;
    business: CardBusiness | null;
};

export async function getLoyaltyCards(userId: string): Promise<CustomerLoyaltyCard[]> {
    const supabase = await createClient();

    const { data } = await supabase
        .from("loyalty_cards")
        .select(
            `
                id, card_code, stamps, rewards_redeemed, finished_at,
                loyalty_programs ( id, closed_at, stamps_required, reward, terms, card_colour, card_header, card_accent, stamp_icon, is_active, businesses ( id, slug, name, logo_url ) )
            `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    const cards = ((data ?? []) as unknown as CardRow[]).flatMap((card) => {
        const program = card.loyalty_programs;

        if (!program) {
            return [];
        }

        return [{
            id: card.id,
            code: card.card_code,
            stamps: card.stamps,
            rewardsRedeemed: card.rewards_redeemed,
            programId: program.id,
            stampsRequired: program.stamps_required,
            reward: program.reward,
            terms: program.terms,
            cardColour: program.card_colour,
            cardHeader: program.card_header,
            cardAccent: program.card_accent,
            stampIcon: program.stamp_icon,
            active: program.is_active,
            rewardReady: card.stamps >= program.stamps_required && card.finished_at === null,
            closed: program.closed_at !== null,
            finished: card.finished_at !== null,
            newCardProgramId: null,
            business: Array.isArray(program.businesses) ? program.businesses[0] ?? null : program.businesses,
        }];
    });

    // A card that has nothing left to collect points at the one that
    // replaced it, which is in this same list: it was put there as the
    // old one filled. A closed card still filling says its own ending
    // and nothing else — the new one is not theirs yet.
    const openCard = new Map(
        cards
            .filter((card) => !card.closed && card.business)
            .map((card) => [card.business!.id, card.programId]),
    );

    return cards
        .map((card) => ({
            ...card,
            newCardProgramId: card.closed && card.business && (card.finished || card.rewardReady)
                ? openCard.get(card.business.id) ?? null
                : null,
        }))
        // Finished cards stay, as history, under the ones still going.
        .sort(liveCardsFirst);
}

// Rewards ready first, then the cards closest to one.
export function byNextReward(a: CustomerLoyaltyCard, b: CustomerLoyaltyCard) {
    if (a.rewardReady !== b.rewardReady) return a.rewardReady ? -1 : 1;
    return b.stamps / b.stampsRequired - a.stamps / a.stampsRequired;
}
