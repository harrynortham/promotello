import Image from "next/image";
import type { ReactNode } from "react";
import { FiGift } from "react-icons/fi";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { cardTheme } from "@/lib/loyalty-design";
import { storedImage } from "@/lib/images";

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
    className?: string;
    id?: string;
}) {
    const rewardWording = reward.trim()
        ? reward.trim().charAt(0).toLowerCase() + reward.trim().slice(1)
        : "your reward";
    const rewardReady = stamps >= stampsRequired;
    const theme = cardTheme({ colour, header, accent });

    return (
        <article
            id={id}
            className={`overflow-hidden rounded-xl border bg-white shadow-sm ${className}`}
        >
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
                        <a href={businessHref} className="block truncate font-semibold hover:underline">
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
                {rewardReady && (
                    <p
                        className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
                        style={{ backgroundColor: `${theme.stamp}1a`, color: theme.stamp }}
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

                {terms?.trim() && (
                    <p className="mt-4 text-xs leading-5 text-[#17233B]/65">{terms.trim()}</p>
                )}
            </div>
        </article>
    );
}
