import type { NotificationContent } from "@/lib/notifications";
import { createAdminClient } from "@/utils/supabase/admin";

// Putting a notification in front of somebody.
//
// Server only, and the service role: createAdminClient reads the service
// key, which exists only on the server. There is no insert policy on
// notifications either, so a browser cannot write one however it asks. That
// means these run after somebody else has already checked who is
// asking, the same rule lib/business-review-emails.ts works under.
//
// Nothing here ever throws. A notification is a courtesy on top of
// whatever just happened — an approval, a claim, a follow — and none of
// those should fail because we couldn't tell anyone about it. Failures
// go to console.error, as the email senders do.
//
// Independent of email: it runs whether or not an email was sent or the
// business has that email switched off, and a failed email does not
// take the notification with it.

type Row = {
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    href: string | null;
    business_id: string | null;
    dedupe_key: string | null;
};

function rowsFor(userIds: string[], content: NotificationContent): Row[] {
    // One person told twice by the same call is still told once.
    return [...new Set(userIds.filter(Boolean))].map((userId) => ({
        user_id: userId,
        type: content.type,
        title: content.title,
        body: content.body ?? null,
        href: content.href ?? null,
        business_id: content.businessId ?? null,
        dedupe_key: content.dedupeKey ?? null,
    }));
}

export async function notifyUsers(userIds: string[], content: NotificationContent) {
    const rows = rowsFor(userIds, content);

    if (rows.length === 0) return { sent: 0 };

    try {
        // The unique index on (user_id, dedupe_key) is what makes
        // sending twice safe: the second one is dropped rather than
        // doubling up in somebody's list.
        const { error } = await createAdminClient()
            .from("notifications")
            .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });

        if (error) {
            console.error(`Notifications: failed to send ${content.type}`, error);
            return { sent: 0 };
        }

        return { sent: rows.length };
    } catch (error) {
        console.error(`Notifications: failed to send ${content.type}`, error);
        return { sent: 0 };
    }
}

// Everybody who runs a business: its owners and its admins. The same
// people business_manager_emails writes to.
export async function notifyBusinessManagers(businessId: string, content: NotificationContent) {
    try {
        const { data, error } = await createAdminClient().rpc("business_manager_ids", {
            requested_business_id: businessId,
        });

        if (error) {
            console.error("Notifications: failed to load the people who run this business", error);
            return { sent: 0 };
        }

        return await notifyUsers((data ?? []) as string[], content);
    } catch (error) {
        console.error("Notifications: failed to load the people who run this business", error);
        return { sent: 0 };
    }
}

// Notifications older than 90 days go in the daily job. Nobody scrolls
// back a season, and the list is cheaper to read without them.
export async function deleteOldNotifications() {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    try {
        const { error, count } = await createAdminClient()
            .from("notifications")
            .delete({ count: "exact" })
            .lt("created_at", cutoff);

        if (error) {
            console.error("Notifications: failed to tidy up old ones", error);
            return { deleted: 0 };
        }

        return { deleted: count ?? 0 };
    } catch (error) {
        console.error("Notifications: failed to tidy up old ones", error);
        return { deleted: 0 };
    }
}
