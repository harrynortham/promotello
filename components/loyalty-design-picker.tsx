"use client";

import { FiCheck, FiCoffee, FiGift, FiHeart, FiStar } from "react-icons/fi";

import { Label } from "@/components/ui/label";
import {
    CARD_COLOURS,
    STAMP_ICONS,
    STAMP_ICON_LABELS,
    type CardColour,
    type StampIcon,
} from "@/lib/loyalty-design";

const icons: Record<StampIcon, typeof FiCheck> = {
    check: FiCheck,
    star: FiStar,
    heart: FiHeart,
    coffee: FiCoffee,
    gift: FiGift,
};

// Choosing how a loyalty card looks: used when setting a card up, and
// again from Card design once it is live.
export function LoyaltyDesignPicker({
    colour,
    icon,
    onColour,
    onIcon,
    showStamps = true,
    colourLabel = "Card colour",
    className = "",
}: {
    colour: CardColour;
    icon: StampIcon;
    onColour: (value: CardColour) => void;
    onIcon: (value: StampIcon) => void;
    // Off where there are no stamps to choose an icon for, like an offer.
    showStamps?: boolean;
    colourLabel?: string;
    className?: string;
}) {
    return (
            <div className={`space-y-6 ${className}`}>
                <div className="space-y-3">
                    <Label>{colourLabel}</Label>

                    <div className="flex flex-wrap gap-3">
                        {(Object.keys(CARD_COLOURS) as CardColour[]).map((key) => {
                            const option = CARD_COLOURS[key];
                            const isChosen = key === colour;

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => onColour(key)}
                                    aria-pressed={isChosen}
                                    title={option.label}
                                    className={`flex size-12 cursor-pointer items-center justify-center rounded-full transition ${isChosen
                                        ? "ring-2 ring-[#17233B] ring-offset-2"
                                        : "ring-1 ring-[#17233B]/10 hover:ring-[#17233B]/30"
                                        }`}
                                    style={{ backgroundColor: option.header }}
                                >
                                    <span className="sr-only">{option.label}</span>
                                    <span
                                        aria-hidden="true"
                                        className="size-4 rounded-full"
                                        style={{ backgroundColor: option.stamp }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {showStamps && (
                    <div className="space-y-3">
                        <Label>Stamp</Label>

                        <div className="flex flex-wrap gap-3">
                            {STAMP_ICONS.map((key) => {
                                const Icon = icons[key];
                                const isChosen = key === icon;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => onIcon(key)}
                                        aria-pressed={isChosen}
                                        title={STAMP_ICON_LABELS[key]}
                                        className={`flex size-12 cursor-pointer items-center justify-center rounded-full border-2 text-white transition ${isChosen
                                            ? "ring-2 ring-[#17233B] ring-offset-2"
                                            : "opacity-70 hover:opacity-100"
                                            }`}
                                        style={{
                                            backgroundColor: CARD_COLOURS[colour].stamp,
                                            borderColor: CARD_COLOURS[colour].stamp,
                                        }}
                                    >
                                        <span className="sr-only">{STAMP_ICON_LABELS[key]}</span>
                                        <Icon aria-hidden="true" className="size-5" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
    );
}
