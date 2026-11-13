"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { FiCheckCircle } from "react-icons/fi";

import { LoyaltyCard } from "@/components/loyalty-card";
import { createClient } from "@/utils/supabase/client";

// The card, kept up to date while it is on screen.
//
// Staff press "Add a stamp" on their phone while the customer holds
// theirs out, and the stamp lands on the staff member's screen. This is
// the other half of that: the row changes, Realtime sends it to the
// browsers allowed to read it — which RLS says is this customer's —
// and the card draws itself again with the stamp on it.
//
// Only the numbers move. Everything else about the card is what the
// server rendered, so a stamp is a stamp rather than a fresh page.

type CardProps = ComponentProps<typeof LoyaltyCard>;

export function LiveLoyaltyCard({
    cardId,
    stamps,
    rewardsRedeemed,
    finished = false,
    qr,
    ...card
}: CardProps & {
    // The row to listen to, which is the customer's own card.
    cardId: string;
    qr: ReactNode;
}) {
    const [live, setLive] = useState({ stamps, rewardsRedeemed: rewardsRedeemed ?? 0, finished });
    const [justStamped, setJustStamped] = useState(false);
    const latest = useRef(live);

    // A page rendered again by the server — a reload, or a revalidate —
    // is the truth, so it wins over whatever arrived before it.
    useEffect(() => {
        latest.current = { stamps, rewardsRedeemed: rewardsRedeemed ?? 0, finished };
        setLive(latest.current);
    }, [stamps, rewardsRedeemed, finished]);

    useEffect(() => {
        const supabase = createClient();
        let watching = true;

        const apply = (next: { stamps: number; rewardsRedeemed: number; finished: boolean }) => {
            if (!watching) return;

            // A stamp is worth saying so about; a reward being redeemed
            // is staff taking something off the card, which says itself.
            const stamped = next.stamps > latest.current.stamps;

            latest.current = next;
            setLive(next);

            if (stamped) setJustStamped(true);
        };

        // What the card says now, asked for rather than waited for.
        const catchUp = () => {
            void supabase
                .from("loyalty_cards")
                .select("stamps, rewards_redeemed, finished_at")
                .eq("id", cardId)
                .maybeSingle()
                .then(({ data }) => {
                    if (!data) return;

                    apply({
                        stamps: Number(data.stamps),
                        rewardsRedeemed: Number(data.rewards_redeemed ?? 0),
                        finished: data.finished_at !== null,
                    });
                });
        };

        const onVisible = () => {
            if (document.visibilityState === "visible") catchUp();
        };

        // Joined after a breath, not on the spot. A component that
        // mounts, unmounts and mounts again — which is every mount in
        // development, and any quick step backwards — otherwise joins
        // and leaves within a few milliseconds, and the second channel
        // can be handed the subscription the first one is in the middle
        // of taking down: subscribed, by its own account, to nothing.
        // Waiting means the first mount never joins at all.
        let channel: RealtimeChannel | null = null;

        const joining = setTimeout(() => {
            channel = supabase
                .channel(`loyalty-card-${cardId}-${Math.random().toString(36).slice(2)}`)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "loyalty_cards",
                        filter: `id=eq.${cardId}`,
                    },
                    ({ new: row }) =>
                        apply({
                            stamps: Number(row.stamps ?? latest.current.stamps),
                            rewardsRedeemed: Number(row.rewards_redeemed ?? latest.current.rewardsRedeemed),
                            // The last reward claimed on a card nobody
                            // can join any more: it goes grey where it
                            // stands, rather than at the next reload.
                            finished: row.finished_at != null,
                        }),
                )
                // Realtime says "subscribed" when the channel is joined,
                // which is a moment before the database subscription behind
                // it exists; a stamp added in between arrives nowhere. This
                // system event is the server saying it is really listening,
                // and the phone waking up in somebody's hand at the counter
                // is the other time the card may have missed something.
                .on("system", {}, (payload: { extension?: string; status?: string }) => {
                    if (payload.extension === "postgres_changes" && payload.status === "ok") catchUp();
                })
                .subscribe((status) => {
                    if (status === "SUBSCRIBED") catchUp();
                });
        }, 100);

        document.addEventListener("visibilitychange", onVisible);

        return () => {
            watching = false;
            clearTimeout(joining);
            document.removeEventListener("visibilitychange", onVisible);
            if (channel) void supabase.removeChannel(channel);
        };
    }, [cardId]);

    // Long enough to be noticed by somebody who looked up at the staff
    // member as it landed, and still gone by the time they next look at
    // the card.
    useEffect(() => {
        if (!justStamped) return;

        const timer = setTimeout(() => setJustStamped(false), 12_000);

        return () => clearTimeout(timer);
    }, [justStamped]);

    return (
        <LoyaltyCard
            {...card}
            stamps={live.stamps}
            rewardsRedeemed={live.rewardsRedeemed}
            finished={live.finished}
            qr={qr}
            // The whole card answers, so somebody looking at the QR
            // sees something happen even if the new stamp is at the
            // other end of the row.
            className={`${card.className ?? ""} transition duration-500 ${
                justStamped ? "scale-[1.015] ring-2 ring-[#FF593F]/40" : "scale-100"
            }`}
            // The stamp that just landed, so it can arrive rather
            // than simply be there.
            landedAt={justStamped ? live.stamps - 1 : undefined}
            // Said out loud as well as drawn. The element stays in
            // place and its words change, which is the one way a
            // screen reader reliably announces them.
            note={
                <span
                    role="status"
                    aria-live="polite"
                    // Coral, not the card's own colour: a card in a
                    // muted palette washed the message out, and this is
                    // the one thing on it that has just happened.
                    className={`inline-flex items-center gap-1.5 rounded-full bg-[#FF593F] text-xs font-semibold text-white transition duration-300 ${
                        justStamped ? "px-2.5 py-1 opacity-100" : "opacity-0"
                    }`}
                >
                    {justStamped && (
                        <>
                            <FiCheckCircle aria-hidden="true" className="size-3.5" />
                            Stamp added
                        </>
                    )}
                </span>
            }
        />
    );
}
