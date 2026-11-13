"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/client";

// The list at /notifications, kept up to date while it is open.
//
// The dot on the avatar has its own subscription
// (components/site/use-unread-notifications.ts) because it is on every
// page; this is the list itself, and it needs the server to draw the
// row rather than the count — the words, the time, the link. So it asks
// for the page again.
//
// Realtime sends a row only to a client whose RLS lets it read the row,
// and notifications_select_own says these are theirs.
export function NotificationsLive({ userId }: { userId: string }) {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        let watching = true;

        const catchUp = () => {
            if (watching) router.refresh();
        };

        // A phone that went in a pocket and came out again: the socket
        // may have gone with it.
        const onVisible = () => {
            if (document.visibilityState === "visible") catchUp();
        };

        document.addEventListener("visibilitychange", onVisible);

        // Joined after a breath, on a topic of its own: the same
        // remount race as everywhere else we do this.
        let channel: RealtimeChannel | null = null;

        const joining = setTimeout(() => {
            channel = supabase
                .channel(`notifications-list-${userId}-${Math.random().toString(36).slice(2)}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "notifications",
                        filter: `user_id=eq.${userId}`,
                    },
                    catchUp,
                )
                .subscribe();
        }, 100);

        return () => {
            watching = false;
            clearTimeout(joining);
            document.removeEventListener("visibilitychange", onVisible);
            if (channel) void supabase.removeChannel(channel);
        };
    }, [userId, router]);

    return null;
}
