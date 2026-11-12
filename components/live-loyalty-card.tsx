"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { FiCheckCircle } from "react-icons/fi";

import { LoyaltyCard } from "@/components/loyalty-card";
import { cardTheme } from "@/lib/loyalty-design";
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
    qr,
    ...card
}: CardProps & {
    // The row to listen to, which is the customer's own card.
    cardId: string;
    qr: ReactNode;
}) {
    const [live, setLive] = useState({ stamps, rewardsRedeemed: rewardsRedeemed ?? 0 });
    const [justStamped, setJustStamped] = useState(false);
    const latest = useRef(live);

    // A page rendered again by the server — a reload, or a revalidate —
    // is the truth, so it wins over whatever arrived before it.
    useEffect(() => {
        latest.current = { stamps, rewardsRedeemed: rewardsRedeemed ?? 0 };
        setLive(latest.current);
    }, [stamps, rewardsRedeemed]);

    useEffect(() => {
        const supabase = createClient();
        let watching = true;

        const apply = (next: { stamps: number; rewardsRedeemed: number }) => {
            if (!watching) return;

            // A stamp is worth saying so about; a reward being redeemed
            // is staff taking something off the card, which says itself.
            const stamped = next.stamps > latest.current.stamps;

            latest.current = next;
            setLive(next);

            if (stamped) setJustStamped(true);
        };

        const channel = supabase
            .channel(`loyalty-card-${cardId}`)
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
                    }),
            )
            .subscribe((status) => {
                if (status !== "SUBSCRIBED") return;

                // The gap between the server drawing this card and the
                // channel being ready is a second or two of a phone
                // waking up at a counter — exactly when somebody is
                // being served. Anything that happened in it would
                // otherwise be lost until the next reload, so the card
                // asks once, now that it is listening.
                void supabase
                    .from("loyalty_cards")
                    .select("stamps, rewards_redeemed")
                    .eq("id", cardId)
                    .maybeSingle()
                    .then(({ data }) => {
                        if (!data) return;

                        apply({
                            stamps: Number(data.stamps),
                            rewardsRedeemed: Number(data.rewards_redeemed ?? 0),
                        });
                    });
            });

        return () => {
            watching = false;
            void supabase.removeChannel(channel);
        };
    }, [cardId]);

    // Long enough to be read over somebody's shoulder, short enough that
    // it is gone before they put the phone away.
    useEffect(() => {
        if (!justStamped) return;

        const timer = setTimeout(() => setJustStamped(false), 6_000);

        return () => clearTimeout(timer);
    }, [justStamped]);

    // The business's own colour, so the message belongs to the card it
    // lands on rather than to the app.
    const theme = cardTheme({ colour: card.colour, header: card.header, accent: card.accent });

    return (
        <LoyaltyCard
            {...card}
            stamps={live.stamps}
            rewardsRedeemed={live.rewardsRedeemed}
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
                    className={`inline-flex items-center gap-1.5 rounded-full text-xs font-semibold transition duration-300 ${
                        justStamped ? "px-2.5 py-1 opacity-100" : "opacity-0"
                    }`}
                    style={justStamped ? { backgroundColor: `${theme.stamp}1a`, color: theme.stamp } : undefined}
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
