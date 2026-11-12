import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowRight, FiCheck, FiGift } from "react-icons/fi";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { cardTheme, readableAccent, tint } from "@/lib/loyalty-design";
import { storedImage } from "@/lib/images";
import { cn } from "@/lib/utils";

// A customer's stamp card: the one on /dashboard/loyalty, and the preview
// a business sees while setting theirs up. Both render this, so what the
// business builds is what the customer gets.
export function LoyaltyCard({
    businessName,
    businessHref,
    logoUrl,
    stampsRequired,
    reward,
    stamps,
    rewardsRedeemed = 0,
    active = true,
    terms,
    code,
    scanTitle = "Show this to staff",
    scanHint = "They can scan it or type the code.",
    // Big enough for a phone held over it. A poster asks for more: it
    // is read from the other side of a window.
    qrSize = "size-52 sm:size-32",
    qr,
    colour,
    header,
    accent,
    stampIcon,
    landedAt,
    note,
    href,
    lastOne = false,
    finished = false,
    newCardHref,
    className = "",
    id,
}: {
    businessName: string;
    // A link on the name, on the customer's own card.
    businessHref?: string;
    logoUrl?: string | null;
    stampsRequired: number;
    reward: string;
    stamps: number;
    rewardsRedeemed?: number;
    active?: boolean;
    terms?: string | null;
    // The customer's own card code. Empty on a poster, where the card
    // is a picture of one nobody holds yet.
    code?: string;
    // What the panel beside the QR says. A card in somebody's phone is
    // shown to staff; the same card on a wall is scanned to get one.
    scanTitle?: string;
    scanHint?: string;
    qrSize?: string;
    qr: ReactNode;
    // The business's chosen look, from its loyalty programme.
    colour?: string | null;
    // Their own two colours, where colour is "custom".
    header?: string | null;
    accent?: string | null;
    stampIcon?: string | null;
    // The stamp that has just been added, which arrives rather than
    // simply being there. Nothing animates without it.
    landedAt?: number;
    // Said beside the count, where somebody watching the stamps land is
    // already looking. Nothing else on the card moves to make room.
    note?: ReactNode;
    // Where the whole card goes when it is pressed. The business's
    // name is still its own link; everything else is the card.
    href?: string;
    // The business has stopped handing this card out. It fills once,
    // pays out once, and is then finished for good — so say so while
    // there is still something to collect.
    lastOne?: boolean;
    finished?: boolean;
    // The card they hold now, where there is one.
    newCardHref?: string;
    className?: string;
    id?: string;
}) {
    const rewardWording = reward.trim()
        ? reward.trim().charAt(0).toLowerCase() + reward.trim().slice(1)
        : "your reward";
    const rewardReady = stamps >= stampsRequired && !finished;
    const theme = cardTheme({ colour, header, accent });
    const rewardTint = tint(theme.stamp, 0.1);

    return (
        <article
            id={id}
            className={cn(
                "relative overflow-hidden rounded-xl border bg-white shadow-sm",
                className,
                // The same lift every pressable card in the app has.
                href && "transition duration-200 hover:-translate-y-0.5 hover:shadow-lg",
            )}
        >
            {/* A card in a list is a thing to open, and a stamp card
                has no obvious place to put a "view" link without
                taking space from the stamps. So the card itself is
                the link, laid over it rather than around it: the
                business's name underneath stays a link of its own,
                which nesting would not allow. */}
            {href && (
                <Link
                    href={href}
                    className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#FF593F]"
                >
                    <span className="sr-only">Open your {businessName} card</span>
                </Link>
            )}
            {/* The ink follows the band: the six named colours all
                carry white, and a business's own might not. */}
            <div
                className="flex items-center gap-3 px-6 py-4"
                style={{ backgroundColor: theme.header, color: theme.ink }}
            >
                {storedImage(logoUrl) ? (
                    <Image src={storedImage(logoUrl)!} alt="" width={40} height={40} className="size-10 rounded-xl object-cover" />
                ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-current/10 font-semibold">
                        {businessName.charAt(0).toUpperCase()}
                    </span>
                )}

                <div className="min-w-0">
                    {businessHref ? (
                        <a href={businessHref} className="relative z-20 block w-fit max-w-full truncate font-semibold hover:underline">
                            {businessName}
                        </a>
                    ) : (
                        <p className="truncate font-semibold">{businessName}</p>
                    )}

                    <p className="text-sm" style={{ color: theme.ink, opacity: 0.7 }}>
                        {stampsRequired} stamps for {rewardWording}
                    </p>
                </div>
            </div>

            <div className="p-6">
                {finished && (
                    <p className="mb-4 flex items-center gap-2 rounded-xl bg-[#17233B]/5 px-3 py-2 text-sm font-semibold text-[#17233B]/70">
                        <FiCheck aria-hidden="true" />
                        Finished: you claimed the reward on this one
                    </p>
                )}

                {rewardReady && (
                    <p
                        className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
                        // The accent as it reads rather than as it is: a
                        // pale gold or a teal is picked to carry white
                        // on a stamp, and disappears as words.
                        style={{ backgroundColor: rewardTint, color: readableAccent(theme.stamp, rewardTint) }}
                    >
                        <FiGift aria-hidden="true" />
                        Reward ready: ask staff to redeem it
                    </p>
                )}

                <LoyaltyStamps
                    stamps={stamps}
                    required={stampsRequired}
                    colour={colour}
                    header={header}
                    accent={accent}
                    icon={stampIcon}
                    landedAt={landedAt}
                />

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="text-sm text-[#17233B]/70">
                        {stamps} of {stampsRequired} stamps
                        {rewardsRedeemed > 0 && ` · ${rewardsRedeemed} redeemed`}
                        {!active && " · paused by the business"}
                    </p>
                    {note}
                </div>

                {/* The ending, said while there is still something to
                    collect rather than sprung at the till. */}
                {lastOne && (
                    <p className="mt-2 text-xs text-[#17233B]/55">
                        Last one: this card won&apos;t restart.
                    </p>
                )}

                {/* A finished card has nothing to show anybody: no code
                    to scan, no stamp to collect. It stays in the list
                    as what it is, something they finished. */}
                {!finished && (
                <div className="mt-6 flex flex-col items-center gap-4 rounded-xl bg-[#FFF8F0] p-5 text-center sm:flex-row sm:gap-5 sm:p-4 sm:text-left">
                    <div className={`shrink-0 rounded-xl bg-white p-2 ${qrSize} [&_svg]:h-full [&_svg]:w-full`}>
                        {qr}
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-medium">{scanTitle}</p>
                        {code && (
                            <p className="mt-2 font-mono text-lg font-semibold tracking-[0.2em]">{code}</p>
                        )}
                        <p className={`text-xs text-[#17233B]/70 ${code ? "mt-1" : "mt-2"}`}>{scanHint}</p>
                    </div>
                </div>
                )}

                {/* Above the overlay link, where the whole card is one:
                    this goes somewhere else. */}
                {newCardHref && (
                    <Link
                        href={newCardHref}
                        className="relative z-20 mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#FF593F] underline-offset-4 hover:underline"
                    >
                        Your new card here
                        <FiArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                )}

                {terms?.trim() && (
                    <p className="mt-4 text-xs leading-5 text-[#17233B]/65">{terms.trim()}</p>
                )}
            </div>
        </article>
    );
}
