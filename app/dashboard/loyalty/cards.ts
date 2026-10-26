import { createClient } from "@/utils/supabase/server";

// The signed-in customer's loyalty cards, newest first. Shared by the
// loyalty cards page and the dashboard.

type CardRow = {
    id: string;
    card_code: string;
    stamps: number;
    rewards_redeemed: number;
    loyalty_programs: {
        id: string;
        stamps_required: number;
        reward: string;
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
    active: boolean;
    rewardReady: boolean;
    business: CardBusiness | null;
};

export async function getLoyaltyCards(userId: string): Promise<CustomerLoyaltyCard[]> {
    const supabase = await createClient();

    const { data } = await supabase
        .from("loyalty_cards")
        .select(
            `
                id, card_code, stamps, rewards_redeemed,
                loyalty_programs ( id, stamps_required, reward, is_active, businesses ( id, slug, name, logo_url ) )
            `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    return ((data ?? []) as unknown as CardRow[]).flatMap((card) => {
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
            active: program.is_active,
            rewardReady: card.stamps >= program.stamps_required,
            business: Array.isArray(program.businesses) ? program.businesses[0] ?? null : program.businesses,
        }];
    });
}

// Rewards ready first, then the cards closest to one.
export function byNextReward(a: CustomerLoyaltyCard, b: CustomerLoyaltyCard) {
    if (a.rewardReady !== b.rewardReady) return a.rewardReady ? -1 : 1;
    return b.stamps / b.stampsRequired - a.stamps / a.stampsRequired;
}
