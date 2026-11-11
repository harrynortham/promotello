"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowRight, FiCheck } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// The moment the thing works.
//
// Somebody is standing at a till with a customer in front of them, and
// what they need in that second is one instruction — apply this much off —
// not a green box saying the database was updated. It is also, for most
// owners, the first time they see Promotello do anything at all, so it is
// worth a second of celebration.
//
// Everything moves with CSS and stops for anyone who asked for less
// motion; nothing here is a library.

export function VoucherUsed({
    discount,
    offerTitle,
    customerName,
    usedAt,
    code,
    usedToday,
    description,
    terms,
    businessId,
    showLoyaltyNudge,
}: {
    discount: string;
    offerTitle: string;
    customerName: string | null;
    usedAt: string;
    code: string;
    // Including this one.
    usedToday: number;
    // What the offer covers and what it says: still worth having after
    // the press, because the thing is being handed over now.
    description: string | null;
    terms: string | null;
    businessId: string;
    // Free businesses only: the honest next thing, not a billboard.
    showLoyaltyNudge: boolean;
}) {
    // Mounted first, then animated, so the page never flashes a finished
    // state before it plays.
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        const start = requestAnimationFrame(() => setPlaying(true));

        return () => cancelAnimationFrame(start);
    }, []);

    const when = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
    }).format(new Date(usedAt));

    return (
        <div className="overflow-hidden rounded-3xl bg-[#17233B] text-white shadow-[0_1.5rem_3rem_rgba(23,35,59,0.25)]">
            <div className="relative px-7 pb-8 pt-10 text-center">
                <Sparks playing={playing} />

                <div className="relative mx-auto flex size-20 items-center justify-center">
                    <span
                        className={`absolute inset-0 rounded-full bg-emerald-400/20 ${
                            playing ? "motion-safe:animate-[ring_700ms_ease-out_forwards]" : ""
                        }`}
                    />
                    <span className="relative flex size-16 items-center justify-center rounded-full bg-emerald-400 text-[#17233B]">
                        <FiCheck
                            aria-hidden="true"
                            className={`size-9 ${playing ? "motion-safe:animate-[pop_420ms_cubic-bezier(.2,1.4,.4,1)_both]" : ""}`}
                        />
                    </span>
                </div>

                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Voucher used
                </p>

                {/* The one thing to do next, at the size you can read it
                    from arm's length with a queue behind you. */}
                <p
                    className={`mt-3 text-5xl font-semibold leading-none tracking-tight ${
                        playing ? "motion-safe:animate-[rise_500ms_200ms_ease-out_both]" : ""
                    }`}
                >
                    {discount}
                </p>

                <p className="mt-4 text-base leading-7 text-white/75">
                    Apply it to {customerName ? <strong className="text-white">{customerName}</strong> : "this customer"}
                    &apos;s bill.
                </p>

                <p className="mt-1 text-sm text-white/55">
                    {offerTitle} · {when}
                </p>
            </div>

            {(description || terms) && (
                <div className="space-y-3 border-t border-white/10 px-7 py-5 text-left">
                    {description && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                                What they get
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/80">
                                {description}
                            </p>
                        </div>
                    )}

                    {terms && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                                Terms
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/60">
                                {terms}
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="border-t border-white/10 bg-white/[0.04] px-7 py-5 text-center">
                <p className="text-sm text-white/75">
                    {usedToday === 1
                        ? "The first voucher used here today."
                        : `That's ${usedToday} vouchers used here today.`}
                </p>

                {showLoyaltyNudge && (
                    <p className="mt-2 text-sm leading-6 text-white/60">
                        A stamp card would bring them back for the next one.{" "}
                        <Link
                            href={`/business/${businessId}/billing`}
                            className="font-medium text-emerald-300 underline-offset-4 hover:underline"
                        >
                            Try Pro free
                        </Link>
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2 px-7 pb-7 pt-5">
                <Button
                    render={<Link href={`/business/${businessId}/redemptions`} />}
                    nativeButton={false}
                    size="lg"
                    className="w-full bg-white text-[#17233B] hover:bg-white/90"
                >
                    Next voucher
                    <FiArrowRight aria-hidden="true" />
                </Button>

                <p className="text-center font-mono text-xs tracking-widest text-white/40">{code}</p>
            </div>
        </div>
    );
}

// A handful of marks thrown outward, once. Decorative, so it is hidden
// from anything reading the page aloud.
function Sparks({ playing }: { playing: boolean }) {
    const marks = [
        { x: -120, y: -40, delay: 0, colour: "#FF593F" },
        { x: 120, y: -50, delay: 60, colour: "#FFC24B" },
        { x: -90, y: 60, delay: 120, colour: "#4ADE80" },
        { x: 95, y: 55, delay: 40, colour: "#FF593F" },
        { x: -45, y: -90, delay: 100, colour: "#FFC24B" },
        { x: 55, y: -95, delay: 20, colour: "#4ADE80" },
        { x: -150, y: 10, delay: 150, colour: "#FFC24B" },
        { x: 150, y: 5, delay: 90, colour: "#FF593F" },
    ];

    return (
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-14 block">
            {marks.map((mark, index) => (
                <span
                    key={index}
                    style={
                        {
                            "--x": `${mark.x}px`,
                            "--y": `${mark.y}px`,
                            animationDelay: `${mark.delay}ms`,
                            background: mark.colour,
                        } as React.CSSProperties
                    }
                    className={`absolute left-1/2 top-0 size-2 rounded-full opacity-0 ${
                        playing ? "motion-safe:animate-[spark_900ms_ease-out_forwards]" : ""
                    }`}
                />
            ))}
        </span>
    );
}
