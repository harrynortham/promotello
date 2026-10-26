import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiGift, FiStar } from "react-icons/fi";

import { LoyaltyStamps } from "@/components/loyalty-stamps";

import type { CustomerLoyaltyCard } from "./cards";

// A loyalty card in brief, the same shape as a compact voucher. Opens the
// card on the loyalty cards page, where its QR code is.
export function LoyaltyCardTile({ card }: { card: CustomerLoyaltyCard }) {
    const reward = card.reward.charAt(0).toLowerCase() + card.reward.slice(1);

    return (
        <Link
            href={`/dashboard/loyalty#${card.programId}`}
            className="group flex overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white transition hover:shadow-md"
        >
            <div className="relative flex w-24 shrink-0 items-center justify-center bg-[#FFF4E8] sm:w-28">
                {card.business?.logo_url ? (
                    <Image src={card.business.logo_url} alt="" fill sizes="112px" className="object-cover" />
                ) : (
                    <FiStar aria-hidden="true" className="size-7 text-[#FF593F]" />
                )}
            </div>

            <div className="min-w-0 flex-1 p-4">
                <p className="truncate text-sm text-[#17233B]/70">{card.business?.name ?? "Business"}</p>
                <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">
                    {card.stampsRequired} stamps for {reward}
                </p>

                <div className="mt-3">
                    <LoyaltyStamps stamps={card.stamps} required={card.stampsRequired} size="sm" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    {card.rewardReady ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#FF593F]/10 px-2.5 py-1 text-sm font-semibold text-[#FF593F]">
                            <FiGift aria-hidden="true" />
                            Reward ready
                        </span>
                    ) : (
                        <span className="text-sm text-[#17233B]/70">
                            {card.stamps} of {card.stampsRequired} stamps{!card.active && " · paused"}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-[#FF593F] group-hover:underline">
                        Show card
                        <FiArrowRight aria-hidden="true" />
                    </span>
                </div>
            </div>
        </Link>
    );
}
