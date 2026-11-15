import { rewardGiven, voucherUsed } from "@/lib/notifications";
import { notifyUsers } from "@/lib/notify";
import { createAdminClient } from "@/utils/supabase/admin";

// A record of the moment something a customer was holding was taken.
//
// Claiming and joining are not worth saying — the person just did it,
// and it is on the screen in front of them. Being marked used is
// another thing entirely: it is done on a member of staff's phone, it
// is when six visits of stamps turn into nothing, and it is the only
// place a mistake or a dispute can surface. Quiet, in the list, no
// email: the customer is standing at the counter when it happens, so
// the value is the record rather than the interruption.
//
// Written with the service role, like every other notification — the
// table has no insert policy — and nothing here throws: a voucher that
// was accepted must not be reported as refused because we could not
// write a line about it afterwards.

export async function tellThemTheVoucherWasUsed(redemptionId: string) {
    try {
        const admin = createAdminClient();

        const { data: redemption } = await admin
            .from("offer_redemptions")
            .select("id, user_id, offers ( title, businesses ( name ) )")
            .eq("id", redemptionId)
            .maybeSingle();

        const offer = redemption?.offers as
            | { title: string; businesses: { name: string } | { name: string }[] | null }
            | null
            | undefined;

        // A guest voucher has no account to tell.
        if (!redemption?.user_id || !offer) return { told: 0 };

        const business = Array.isArray(offer.businesses) ? offer.businesses[0] : offer.businesses;

        const { sent } = await notifyUsers(
            [redemption.user_id],
            voucherUsed({
                id: redemption.id,
                offerTitle: offer.title,
                businessName: business?.name ?? "the business",
            }),
        );

        return { told: sent };
    } catch (error) {
        console.error("Could not write the receipt for a used voucher", error);
        return { told: 0 };
    }
}

// The reward itself, handed over at the counter. Looked up by the card
// code, which is what the staff screen has in its hand.
export async function tellThemTheRewardWasGiven(cardCode: string) {
    try {
        const admin = createAdminClient();

        const { data: card } = await admin
            .from("loyalty_cards")
            .select(
                `
                    id, user_id, rewards_redeemed, finished_at,
                    loyalty_programs ( id, reward, businesses ( name ) )
                `,
            )
            .eq("card_code", cardCode)
            .maybeSingle();

        const program = card?.loyalty_programs as
            | { id: string; reward: string; businesses: { name: string } | { name: string }[] | null }
            | null
            | undefined;

        if (!card?.user_id || !program) return { told: 0 };

        const business = Array.isArray(program.businesses)
            ? program.businesses[0]
            : program.businesses;

        const { sent } = await notifyUsers(
            [card.user_id],
            rewardGiven({
                id: card.id,
                programId: program.id,
                businessName: business?.name ?? "the business",
                reward: program.reward,
                round: card.rewards_redeemed ?? 1,
                finished: card.finished_at != null,
            }),
        );

        return { told: sent };
    } catch (error) {
        console.error("Could not write the receipt for a claimed reward", error);
        return { told: 0 };
    }
}
