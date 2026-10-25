import { FiCheck, FiGift } from "react-icons/fi";

// A stamp card: one circle per stamp, the last one marked as the reward.
// Extra stamps beyond a full card (an unclaimed reward plus progress on
// the next) show as a full card.
export function LoyaltyStamps({
    stamps,
    required,
    size = "md",
}: {
    stamps: number;
    required: number;
    size?: "sm" | "md" | "lg";
}) {
    const filled = Math.min(stamps, required);
    const dimension = { sm: "size-7", md: "size-10", lg: "size-12" }[size];
    const icon = { sm: "size-3.5", md: "size-5", lg: "size-6" }[size];

    return (
        <div
            className="flex flex-wrap gap-2"
            role="img"
            aria-label={`${filled} of ${required} stamps collected`}
        >
            {Array.from({ length: required }, (_, index) => {
                const isFilled = index < filled;
                const isReward = index === required - 1;

                return (
                    <span
                        key={index}
                        className={`flex ${dimension} items-center justify-center rounded-full border-2 transition ${isFilled
                            ? "border-[#FF593F] bg-[#C8371D] text-white"
                            : isReward
                                ? "border-dashed border-[#FF593F]/50 bg-[#FF593F]/5 text-[#C8371D]"
                                : "border-dashed border-[#17233B]/20 bg-white text-transparent"
                            }`}
                    >
                        {isReward ? (
                            <FiGift aria-hidden="true" className={icon} />
                        ) : (
                            <FiCheck aria-hidden="true" className={icon} />
                        )}
                    </span>
                );
            })}
        </div>
    );
}
