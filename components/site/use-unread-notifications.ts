"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/utils/supabase/client";

// How many notifications this person hasn't read, for the dot on the
// avatar and the count in the menu.
//
// Nothing here uses Realtime — nothing in the app does yet — so it asks
// again at the two moments a person would expect it to be right: when
// they move to another page, and when they come back to the tab after
// doing something in another one. That covers reading a notification on
// /notifications and seeing the dot go.
//
// RLS makes this their own rows, so the query says nothing about whose.
// It starts at 0 and only ever goes up from an answer, so nothing
// flashes on first paint.
export function useUnreadNotifications() {
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

        return () => {
            isMounted = false;
            window.removeEventListener("focus", refresh);
        };
    }, [count, pathname]);

    return unread;
}
