"use client";

import { useState } from "react";
import { FiCheck, FiCoffee, FiDroplet, FiGift, FiHeart, FiStar } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUSTOM_COLOUR, isHexColour, readableInk, startingCustom } from "@/lib/poster-colour";
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
    custom,
    onCustom,
    customWording = {
        header: { label: "Band", hint: "The block your name sits in" },
        accent: { label: "Pill", hint: "The small line above the headline" },
        sample: "Offer",
    },
    className = "",
}: {
    colour: CardColour | typeof CUSTOM_COLOUR;
    icon: StampIcon;
    onColour: (value: CardColour) => void;
    onIcon: (value: StampIcon) => void;
    // Off where there are no stamps to choose an icon for, like an offer.
    showStamps?: boolean;
    colourLabel?: string;
    // A business's own two colours. Passing this adds a seventh swatch
    // that opens the picker; leaving it out keeps the six, which is what
    // a loyalty card has.
    custom?: { header: string; accent: string } | null;
    onCustom?: (value: { header: string; accent: string }) => void;
    // What the two colours are called where they are being chosen. A
    // poster has a band and a pill; a card has a band and its stamps.
    customWording?: {
        header: { label: string; hint: string };
        accent: { label: string; hint: string };
        sample: string;
    };
    className?: string;
}) {
    const [editing, setEditing] = useState(false);
    const chosenCustom = custom ?? startingCustom(colour);
    const [draft, setDraft] = useState(chosenCustom);
    const stampColour =
        colour === CUSTOM_COLOUR ? chosenCustom.accent : CARD_COLOURS[colour as CardColour].stamp;

    function openPicker() {
        setDraft(custom ?? startingCustom(colour));
        setEditing(true);
    }

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

                        {onCustom && (
                            <button
                                type="button"
                                onClick={openPicker}
                                aria-pressed={colour === CUSTOM_COLOUR}
                                title="Your own colours"
                                className={`flex size-12 cursor-pointer items-center justify-center rounded-full transition ${
                                    colour === CUSTOM_COLOUR
                                        ? "ring-2 ring-[#17233B] ring-offset-2"
                                        : "ring-1 ring-[#17233B]/10 hover:ring-[#17233B]/30"
                                }`}
                                style={{
                                    backgroundColor:
                                        colour === CUSTOM_COLOUR
                                            ? chosenCustom.header
                                            : "transparent",
                                    // Unchosen, it is a wheel rather than a
                                    // seventh colour competing with the six.
                                    backgroundImage:
                                        colour === CUSTOM_COLOUR
                                            ? undefined
                                            : "conic-gradient(#FF593F, #E0A33E, #2FA3A3, #3C2342, #FF593F)",
                                }}
                            >
                                <span className="sr-only">Your own colours</span>

                                {colour === CUSTOM_COLOUR ? (
                                    <span
                                        aria-hidden="true"
                                        className="size-4 rounded-full"
                                        style={{ backgroundColor: chosenCustom.accent }}
                                    />
                                ) : (
                                    <FiDroplet
                                        aria-hidden="true"
                                        className="size-5 text-white drop-shadow"
                                    />
                                )}
                            </button>
                        )}
                    </div>

                    {onCustom && colour === CUSTOM_COLOUR && (
                        <button
                            type="button"
                            onClick={openPicker}
                            className="cursor-pointer text-xs font-medium text-[#FF593F] underline underline-offset-4"
                        >
                            Change your colours
                        </button>
                    )}
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
                                        className={`flex size-12 cursor-pointer items-center justify-center rounded-full border-2 transition ${isChosen
                                            ? "ring-2 ring-[#17233B] ring-offset-2"
                                            : "opacity-70 hover:opacity-100"
                                            }`}
                                        // The icon has to be visible on
                                        // whatever the stamps are, which
                                        // for a brand colour might be
                                        // anything.
                                        style={{
                                            backgroundColor: stampColour,
                                            borderColor: stampColour,
                                            color: readableInk(stampColour),
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

                {onCustom && (
                    <Dialog open={editing} onOpenChange={setEditing}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Your own colours</DialogTitle>
                                <DialogDescription>
                                    The two colours out of your logo: one for the{" "}
                                    {customWording.header.label.toLowerCase()}, one for the{" "}
                                    {customWording.accent.label.toLowerCase()}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {([
                                    ["header", customWording.header.label, customWording.header.hint],
                                    ["accent", customWording.accent.label, customWording.accent.hint],
                                ] as const).map(([key, label, hint]) => (
                                    <div key={key} className="space-y-2">
                                        <Label htmlFor={`custom-${key}`}>{label}</Label>

                                        <div className="flex items-center gap-3">
                                            <input
                                                id={`custom-${key}`}
                                                type="color"
                                                value={draft[key]}
                                                onChange={(event) =>
                                                    setDraft({ ...draft, [key]: event.target.value.toUpperCase() })
                                                }
                                                className="size-12 cursor-pointer rounded-lg border border-[#17233B]/15 bg-white p-1"
                                            />

                                            <Input
                                                value={draft[key]}
                                                onChange={(event) =>
                                                    setDraft({ ...draft, [key]: event.target.value.toUpperCase() })
                                                }
                                                maxLength={7}
                                                spellCheck={false}
                                                className="font-mono"
                                                aria-label={`${label} colour, as a hex code`}
                                            />
                                        </div>

                                        <p className="text-xs leading-5 text-[#17233B]/65">{hint}</p>
                                    </div>
                                ))}

                                {/* What it will look like, including what
                                    can be read on it: a pale brand colour
                                    takes dark type, not white. */}
                                <div
                                    className="flex items-center justify-between rounded-lg px-4 py-3"
                                    style={{
                                        backgroundColor: isHexColour(draft.header) ? draft.header : "#17233B",
                                        color: readableInk(isHexColour(draft.header) ? draft.header : "#17233B"),
                                    }}
                                >
                                    <span className="font-semibold">Your business</span>

                                    <span
                                        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
                                        style={{
                                            backgroundColor: isHexColour(draft.accent) ? draft.accent : "#FF593F",
                                            color: readableInk(isHexColour(draft.accent) ? draft.accent : "#FF593F"),
                                        }}
                                    >
                                        {customWording.sample}
                                    </span>
                                </div>

                                {!(isHexColour(draft.header) && isHexColour(draft.accent)) && (
                                    <p className="text-sm text-destructive">
                                        Both need to be a colour like #17233B.
                                    </p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditing(false)}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    disabled={!(isHexColour(draft.header) && isHexColour(draft.accent))}
                                    onClick={() => {
                                        onCustom(draft);
                                        setEditing(false);
                                    }}
                                >
                                    Use these colours
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
    );
}
