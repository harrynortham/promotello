import { newLoyaltyCard } from "@/lib/notifications";
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
