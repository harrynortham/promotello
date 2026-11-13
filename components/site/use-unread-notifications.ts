"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/client";

// What /notifications fires when somebody reads or deletes something, so
// the dot in the header above the list agrees with the list.
export const NOTIFICATIONS_CHANGED = "promotello:notifications-changed";

// How many notifications this person hasn't read, for the dot on the
// avatar and the count in the menu.
//
// Realtime is what makes the dot appear while somebody is sitting
// still: a reward going ready, an offer approved, a payment failing.
// Everything else is still here, because a socket is not a guarantee —
// it asks again on a page change, on coming back to the tab, and when
// the list says it has changed, since reading something on
// /notifications moves nobody off /notifications.
//
// RLS makes this their own rows twice over: the query says nothing
// about whose, and Realtime sends a row only to a client whose policies
// let it read the row (20270104090000_the_dot_appears_as_it_happens.sql).
// It starts at 0 and only ever goes up from an answer, so nothing
// flashes on first paint.
export function useUnreadNotifications(userId?: string) {
    const [unread, setUnread] = useState(0);
    const pathname = usePathname();

    const count = useCallback(async () => {
        const { count: unreadCount, error } = await createClient()
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .is("read_at", null);

        // Signed out, or offline: say nothing rather than guess.
        if (error) return;

        setUnread(unreadCount ?? 0);
    }, []);

    useEffect(() => {
        let isMounted = true;

        function refresh() {
            if (isMounted) void count();
        }

        refresh();
        window.addEventListener("focus", refresh);
        window.addEventListener(NOTIFICATIONS_CHANGED, refresh);

        // Signed out, or a caller that hasn't got the id yet: the three
        // listeners above are still the whole of it.
        if (!userId) {
            return () => {
                isMounted = false;
                window.removeEventListener("focus", refresh);
                window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
            };
        }

        // Joined after a breath, on a topic of its own: a component
        // that mounts, unmounts and mounts again hands the second
        // channel the subscription the first is taking down, and it
        // then hears nothing. The same reason as in
        // components/live-loyalty-card.tsx.
        const supabase = createClient();
        let channel: RealtimeChannel | null = null;

        const theirs = {
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
        } as const;

        const joining = setTimeout(() => {
            channel = supabase
                .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
                // Arriving, read somewhere else, and deleted: all three
                // move the number.
                .on("postgres_changes", { event: "*", ...theirs }, refresh)
                // The seconds between the first count and the channel
                // being ready are seconds something could have landed
                // in.
                .subscribe((status) => {
                    if (status === "SUBSCRIBED") refresh();
                });
        }, 100);

        return () => {
            isMounted = false;
            clearTimeout(joining);
            window.removeEventListener("focus", refresh);
            window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
            if (channel) void supabase.removeChannel(channel);
        };
    }, [count, pathname, userId]);

    return unread;
}
