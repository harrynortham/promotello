import { followedBusinessClosed } from "@/lib/notifications";
import { notifyUsers } from "@/lib/notify";
import { createAdminClient } from "@/utils/supabase/admin";

// Telling the people who were following a business that it has gone.
//
// Closing already stops new joiners and takes the page out of the
// directory (20261207150000_closing_a_business.sql), and anything a
// customer was holding stays theirs — but a voucher in a wallet for a
// shop that has left is a wasted trip, and nothing said so.
//
// Followers only. Somebody holding a stamp card is not necessarily
// following, but their card already says the business has gone when
// they open it; the follower list is the set of people who asked to
// hear from this business at all.
//
// Never throws: a business that has closed must not be told it failed
// because we could not write a line in somebody's notifications.
export async function tellFollowersItHasClosed(businessId: string) {
    try {
        const admin = createAdminClient();

        const [{ data: business }, { data: followers }] = await Promise.all([
            admin.from("businesses").select("id, name").eq("id", businessId).maybeSingle(),
            admin.from("business_followers").select("user_id").eq("business_id", businessId),
        ]);

        if (!business || !followers?.length) return { told: 0 };

        const { sent } = await notifyUsers(
            followers.map((follower) => follower.user_id as string),
            followedBusinessClosed({ id: business.id, name: business.name }),
        );

        return { told: sent };
    } catch (error) {
        console.error("Could not tell a business's followers that it has closed", error);
        return { told: 0 };
    }
}
