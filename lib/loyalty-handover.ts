import { newLoyaltyCard, rewardReady } from "@/lib/notifications";
import { notifyUsers } from "@/lib/notify";
import { createAdminClient } from "@/utils/supabase/admin";

// Telling somebody they have been handed the new card.
//
// The card itself is given out by the database, inside the transaction
// that stamps or redeems the closed one
// (20261226090000_a_closed_card_gets_one_last_lap.sql), so a customer
// never ends up without one because something here failed. This is only
// the saying so, and notifications are written with the service role —
// the table has no insert policy — the way lib/automations.ts does it.
//
// Nothing here throws. A stamp that worked must not be reported as
// failed because we couldn't put a line in somebody's notifications,
// and the dedupe key means telling them later is harmless.
//
// A guest card has no account to tell. Their own card page carries the
// link to the new one instead.

export async function tellThemAboutTheNewCard(cardId: string | null | undefined) {
    if (!cardId) return;

    try {
        const admin = createAdminClient();

        const { data: card } = await admin
            .from("loyalty_cards")
            .select(
                `
                    id, user_id,
                    loyalty_programs ( id, stamps_required, reward, businesses ( name ) )
                `,
            )
            .eq("id", cardId)
            .maybeSingle();

        const program = card?.loyalty_programs as
            | { id: string; stamps_required: number; reward: string; businesses: { name: string } | { name: string }[] | null }
            | null
            | undefined;

        if (!card?.user_id || !program) return;

        const business = Array.isArray(program.businesses) ? program.businesses[0] : program.businesses;

        await notifyUsers(
            [card.user_id],
            newLoyaltyCard({
                id: card.id,
                programId: program.id,
                stampsRequired: program.stamps_required,
                reward: program.reward,
                businessName: business?.name ?? "The business",
            }),
        );
    } catch (error) {
        console.error("Could not tell a customer about their new loyalty card", error);
    }
}

// And telling somebody the stamp that just landed was the last one.
//
// The till screen already says so to whoever is holding the phone, but
// the person it belongs to is usually putting their coat on. This is
// the line they find later, with the reward named in it.
//
// Same rules as above: never throws, and a guest card has nobody to
// tell.
export async function tellThemTheRewardIsReady(cardCode: string | null | undefined) {
    if (!cardCode) return;

    try {
        const admin = createAdminClient();

        const { data: card } = await admin
            .from("loyalty_cards")
            .select(
                `
                    id, user_id, finished_at, rewards_redeemed,
                    loyalty_programs ( id, reward, businesses ( name ) )
                `,
            )
            .eq("card_code", cardCode)
            .maybeSingle();

        const program = card?.loyalty_programs as
            | { id: string; reward: string; businesses: { name: string } | { name: string }[] | null }
            | null
            | undefined;

        // A finished card has nothing left to claim.
        if (!card?.user_id || card.finished_at || !program) return;

        const business = Array.isArray(program.businesses) ? program.businesses[0] : program.businesses;

        await notifyUsers(
            [card.user_id],
            rewardReady({
                id: card.id,
                programId: program.id,
                businessName: business?.name ?? "The business",
                reward: program.reward,
                round: card.rewards_redeemed ?? 0,
            }),
        );
    } catch (error) {
        console.error("Could not tell a customer their reward is ready", error);
    }
}
