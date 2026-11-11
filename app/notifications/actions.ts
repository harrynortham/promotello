"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

// Marking and deleting, with the person's own session rather than the
// service role: the policies on notifications are what stop anybody
// touching somebody else's, so these don't have to be trusted with it.
// A row that isn't theirs simply matches nothing.
//
// Column grants do the rest: authenticated may update read_at and
// nothing else, so none of this can rewrite what a notification says.

export async function markNotificationRead(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .is("read_at", null);

    if (error) {
        console.error("Notifications: failed to mark one as read", error);
        return { ok: false };
    }

    revalidatePath("/notifications");
    return { ok: true };
}

export async function markAllNotificationsRead() {
    const supabase = await createClient();

    const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);

    if (error) {
        console.error("Notifications: failed to mark them all as read", error);
        return { ok: false };
    }

    revalidatePath("/notifications");
    return { ok: true };
}

// Permanent, and without a confirmation: a notification is not worth
// one, and there is nothing in it that isn't somewhere else.
export async function deleteNotification(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from("notifications").delete().eq("id", id);

    if (error) {
        console.error("Notifications: failed to delete one", error);
        return { ok: false };
    }

    revalidatePath("/notifications");
    return { ok: true };
}
