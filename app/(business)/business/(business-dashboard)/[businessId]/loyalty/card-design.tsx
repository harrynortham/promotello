"use client";

import { useState } from "react";
import { LoyaltyCard } from "@/components/loyalty-card";
import { LoyaltyDesignPicker } from "@/components/loyalty-design-picker";
import { StampQr } from "@/components/stamp-qr";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    CARD_COLOURS,
    DEFAULT_CARD_COLOUR,
    DEFAULT_STAMP_ICON,
    cardColour,
    stampIcon,
    type CardColour,
    type StampIcon,
} from "@/lib/loyalty-design";
import { saveLoyaltyDesign } from "./actions";

// A sample code, so the preview carries a QR like the live card.
const SAMPLE_CODE = "4F8A2C91D0";

export function CardDesign({
    businessId,
    programId,
    businessName,
    businessLogoUrl,
    stampsRequired,
    reward,
    terms,
    colour: savedColour,
    stampIcon: savedIcon,
}: {
    businessId: string;
    programId: string;
    businessName: string;
    businessLogoUrl: string | null;
    stampsRequired: number;
    reward: string;
    terms: string | null;
    colour: string | null;
    stampIcon: string | null;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [colour, setColour] = useState<CardColour>(
        (Object.keys(CARD_COLOURS).find((key) => key === savedColour) as CardColour) ??
            DEFAULT_CARD_COLOUR,
    );
    const [icon, setIcon] = useState<StampIcon>(stampIcon(savedIcon) ?? DEFAULT_STAMP_ICON);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    function open() {
        // Start from what is saved, so closing without saving changes nothing.
        setColour(
            (Object.keys(CARD_COLOURS).find((key) => key === savedColour) as CardColour) ??
                DEFAULT_CARD_COLOUR,
        );
        setIcon(stampIcon(savedIcon));
        setErrorMessage("");
        setIsOpen(true);
    }

    async function save() {
        setIsSaving(true);
        setErrorMessage("");

        const formData = new FormData();
        formData.set("businessId", businessId);
        formData.set("programId", programId);
        formData.set("cardColour", colour);
        formData.set("stampIcon", icon);

        const result = await saveLoyaltyDesign(formData);

        setIsSaving(false);

        if (result?.error) {
            setErrorMessage(result.error);
            return;
        }

        setIsOpen(false);
    }

    return (
        <>
            <Button type="button" variant="outline" size="lg" onClick={open}>
                <span
                    aria-hidden="true"
                    className="size-3 rounded-full"
                    style={{ backgroundColor: cardColour(savedColour).header }}
                />
                Card design
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto p-6 sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Card design</DialogTitle>

                        <DialogDescription>
                            Pick a colour and a stamp. The card changes as you
                            choose, and this is exactly what customers carry.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_20rem] sm:items-start">
                        <div className="space-y-6">
                            <LoyaltyDesignPicker
                                colour={colour}
                                icon={icon}
                                onColour={setColour}
                                onIcon={setIcon}
                            />

                            {errorMessage && (
                                <p role="alert" className="text-sm text-destructive">
                                    {errorMessage}
                                </p>
                            )}

                            <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    className="sm:flex-1"
                                    disabled={isSaving}
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    size="lg"
                                    className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90 sm:flex-1"
                                    disabled={isSaving}
                                    onClick={save}
                                >
                                    {isSaving ? "Saving…" : "Save design"}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17233B]/60">
                                Preview
                            </p>

                            <div className="mt-3">
                                <LoyaltyCard
                                    businessName={businessName}
                                    logoUrl={businessLogoUrl}
                                    stampsRequired={stampsRequired}
                                    reward={reward}
                                    stamps={Math.min(3, stampsRequired - 1)}
                                    terms={terms}
                                    code={SAMPLE_CODE}
                                    qr={<StampQr code={SAMPLE_CODE} />}
                                    colour={colour}
                                    stampIcon={icon}
                                    className="border-[#17233B]/10"
                                />
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
