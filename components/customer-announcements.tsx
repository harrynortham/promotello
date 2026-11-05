import { connection } from "next/server";

import { AnnouncementBar } from "@/components/announcement-bar";
import { announcementFor, readDismissed } from "@/lib/announcements";
import { createClient } from "@/utils/supabase/server";

// Decides whether there is anything worth saying to this person, and says
// at most one thing. Signed out, or nothing to say: nothing is rendered.
export async function CustomerAnnouncements() {
    await connection();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: birthday } = await supabase
        .from("customer_birthdays")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    const announcement = announcementFor({
        hasBirthday: Boolean(birthday),
        dismissed: readDismissed(user.user_metadata),
    });

    return announcement ? <AnnouncementBar announcement={announcement} /> : null;
}
