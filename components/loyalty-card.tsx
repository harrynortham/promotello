import Image from "next/image";
import type { ReactNode } from "react";
import { FiGift } from "react-icons/fi";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { cardColour } from "@/lib/loyalty-design";

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
    qr,
    colour,
    stampIcon,
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
    code: string;
    qr: ReactNode;
    // The business's chosen look, from its loyalty programme.
    colour?: string | null;
    stampIcon?: string | null;
    className?: string;
    id?: string;
}) {
    const rewardWording = reward.trim()
        ? reward.trim().charAt(0).toLowerCase() + reward.trim().slice(1)
        : "your reward";
    const rewardReady = stamps >= stampsRequired;
    const theme = cardColour(colour);

    return (
        <article
            id={id}
            className={`overflow-hidden rounded-xl border bg-white shadow-sm ${className}`}
        >
            <div
                className="flex items-center gap-3 px-6 py-4 text-white"
                style={{ backgroundColor: theme.header }}
            >
                {logoUrl ? (
                    <Image src={logoUrl} alt="" width={40} height={40} className="size-10 rounded-xl object-cover" />
                ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-semibold">
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

                    <p className="text-sm text-white/70">
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
                    icon={stampIcon}
                />

                <p className="mt-3 text-sm text-[#17233B]/70">
                    {stamps} of {stampsRequired} stamps
                    {rewardsRedeemed > 0 && ` · ${rewardsRedeemed} redeemed`}
                    {!active && " · paused by the business"}
                </p>

                <div className="mt-6 flex flex-col items-center gap-4 rounded-xl bg-[#FFF8F0] p-5 text-center sm:flex-row sm:gap-5 sm:p-4 sm:text-left">
                    <div className="size-52 shrink-0 rounded-xl bg-white p-2 sm:size-32 [&_svg]:h-full [&_svg]:w-full">
                        {qr}
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-medium">Show this to staff</p>
                        <p className="mt-2 font-mono text-lg font-semibold tracking-[0.2em]">{code}</p>
                        <p className="mt-1 text-xs text-[#17233B]/70">They can scan it or type the code.</p>
                    </div>
                </div>

                {terms?.trim() && (
                    <p className="mt-4 text-xs leading-5 text-[#17233B]/65">{terms.trim()}</p>
                )}
            </div>
        </article>
    );
}
