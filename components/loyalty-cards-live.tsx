"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/client";

// The customer's wallet, kept up to date while it is open.
//
// A stamp lands on the card itself (components/live-loyalty-card.tsx):
// the numbers move and nothing else has to. The two things this is for
// are changes the card cannot draw on its own.
//
// A card arrives. When a closed card fills, the business's new card is
// put in their wallet in the same breath
// (20261226090000_a_closed_card_gets_one_last_lap.sql), and a card that
// is not on the page cannot add itself to it.
//
// A card finishes. It goes grey where it stands, but it also belongs
// under the cards they are still collecting on, and it is the server
// that puts the list in that order.
//
// Both are the page as a whole being out of date, so both ask the
// server for it again. Realtime sends a row only to a client whose RLS
// lets it read the row, and loyalty_cards_select_own says these are
// theirs.

export function LoyaltyCardsLive({ userId }: { userId: string }) {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        let watching = true;

        const catchUp = () => {
            if (watching) router.refresh();
        };

        const theirs = {
            schema: "public",
            table: "loyalty_cards",
            filter: `user_id=eq.${userId}`,
        } as const;

        // Joined after a breath: a component that mounts, unmounts and
        // mounts again hands the second channel the subscription the
        // first is taking down, and it then hears nothing. The same
        // reason as in components/live-loyalty-card.tsx.
        let channel: RealtimeChannel | null = null;

        const joining = setTimeout(() => {
            channel = supabase
                .channel(`loyalty-cards-${userId}-${Math.random().toString(36).slice(2)}`)
                .on("postgres_changes", { event: "INSERT", ...theirs }, catchUp)
                .on("postgres_changes", { event: "UPDATE", ...theirs }, ({ new: row }) => {
                    // Stamps and rewards are the card's own business.
                    // A card finishing changes the list around it.
                    if (row.finished_at != null) catchUp();
                })
                // The seconds between the server drawing this list and
                // the channel being ready are the seconds somebody is
                // being served in. Asking once, now that it is
                // listening, covers anything that happened in them.
                .subscribe((status) => {
                    if (status === "SUBSCRIBED") catchUp();
                });
        }, 100);

        return () => {
            watching = false;
            clearTimeout(joining);
            if (channel) void supabase.removeChannel(channel);
        };
    }, [userId, router]);

    return null;
}
