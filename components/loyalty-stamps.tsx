import { FiCheck, FiCoffee, FiGift, FiHeart, FiScissors, FiShoppingBag, FiStar } from "react-icons/fi";

import {
    cardTheme,
    readableInk,
    stampIcon,
    type StampIcon,
} from "@/lib/loyalty-design";

const icons: Record<StampIcon, typeof FiCheck> = {
    check: FiCheck,
    star: FiStar,
    heart: FiHeart,
    coffee: FiCoffee,
    gift: FiGift,
    scissors: FiScissors,
    bag: FiShoppingBag,
};

// A stamp card: one circle per stamp, the last one marked as the reward.
// Extra stamps beyond a full card (an unclaimed reward plus progress on
// the next) show as a full card.
export function LoyaltyStamps({
    stamps,
    required,
    size = "md",
    colour,
    header,
    accent: customAccent,
    icon: chosenIcon,
    landedAt,
    balanced = false,
}: {
    stamps: number;
    required: number;
    size?: "xs" | "sm" | "md" | "lg";
    // The business's chosen look; both fall back to the original card.
    colour?: string | null;
    icon?: string | null;
    // Their own two colours, where colour is "custom".
    header?: string | null;
    accent?: string | null;
    // The stamp just added, which lands with a bounce instead of
    // appearing between one render and the next.
    landedAt?: number;
    // Even rows instead of eight-then-the-rest. Only the narrow card on
    // a preview page asks for it: everywhere else the row of eight is
    // the established look and changing it would move a card thousands
    // of people have already seen.
    balanced?: boolean;
}) {
    const filled = Math.min(stamps, required);
    const accent = cardTheme({ colour, header, accent: customAccent }).stamp;
    // The tick sits on the stamp, and a business's own colour might be
    // a yellow that white disappears into.
    const stampInk = readableInk(accent);
    const StampIconComponent = icons[stampIcon(chosenIcon)];
    // xs is for a card inside a phone frame on a preview page,
    // where sm still made the stamps the loudest thing on it.
    const widest = { xs: 20, sm: 28, md: 40, lg: 48 }[size];
    const icon = { xs: "size-2.5", sm: "size-3.5", md: "size-5", lg: "size-6" }[size];

    // Eight to a row. Wrapping wherever the width ran out put seven on
    // one line and two on the next, which reads as a mistake; a grid of
    // eight columns keeps the rows even and lets the stamps shrink a
    // little on a narrow card rather than spill onto a line of their
    // own. A card of eight — what most of them are — is one row.
    // Still eight at most. Balanced, it spreads them evenly over however
    // many rows that takes — nine becomes five and four rather than
    // eight and a lone one, which reads as a mistake on a small card.
    const rows = Math.ceil(required / 8);
    const columns = balanced ? Math.ceil(required / rows) : Math.min(required, 8);

    return (
        <div
            // Packed from the left, so the row starts where the words
            // above it start. On a card the columns fill the width and
            // it makes no odds; anywhere wider than the row, centring
            // floated the stamps away from everything else.
            className={balanced ? "grid gap-2" : "grid justify-start gap-2"}
            style={{
                // Balanced, the columns stretch to fill the row rather
                // than sitting at a fixed width with the rest of the
                // card empty beside them. Everywhere else they keep
                // their size and pack from the left.
                gridTemplateColumns: balanced
                    ? `repeat(${columns}, minmax(0, 1fr))`
                    : `repeat(${columns}, minmax(0, ${widest}px))`,
            }}
            role="img"
            aria-label={`${filled} of ${required} stamps collected`}
        >
            {Array.from({ length: required }, (_, index) => {
                const isFilled = index < filled;
                const isReward = index === required - 1;

                return (
                    <span
                        key={index}
                        style={
                            isFilled
                                ? { borderColor: accent, backgroundColor: accent, color: stampInk }
                                : isReward
                                    ? { borderColor: `${accent}80`, backgroundColor: `${accent}0d`, color: accent }
                                    : undefined
                        }
                        className={`flex aspect-square w-full items-center justify-center rounded-full border-2 transition duration-500 ${
                            index === landedAt ? "scale-110" : "scale-100"
                        } ${isFilled
                            ? ""
                            : isReward
                                ? "border-dashed"
                                // No fill: an empty stamp is the dotted
                                // outline of one, on a white card or on
                                // a dark panel alike.
                                : "border-dashed border-[#17233B]/20 text-transparent"
                            }`}
                    >
                        {isReward ? (
                            <FiGift aria-hidden="true" className={icon} />
                        ) : (
                            <StampIconComponent aria-hidden="true" className={icon} />
                        )}
                    </span>
                );
            })}
        </div>
    );
}
