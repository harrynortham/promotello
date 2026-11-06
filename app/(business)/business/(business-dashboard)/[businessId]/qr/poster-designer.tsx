"use client";

import { useState } from "react";

import { LoyaltyDesignPicker } from "@/components/loyalty-design-picker";
import { QrPoster } from "@/components/qr-poster";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    DEFAULT_STAMP_ICON,
    cardColourName,
    type CardColour,
} from "@/lib/loyalty-design";
import { createQrCode } from "./actions";
import { PosterSizeSelect } from "./poster-size-select";

// A4 is 794px wide at 96dpi; A5 is 70.5% of it, so the preview shrinks
// with the real sheet.
const PREVIEW_WIDTH = { a4: 256, a5: 181 };

// The create form and the poster it will print, side by side, so the
// colour and the words can be seen before the code exists.
export function PosterDesigner({
    businessId,
    businessName,
    place,
    logoUrl,
    offers,
    previewSvg,
    previewLink,
    size,
}: {
    businessId: string;
    businessName: string;
    place?: string | null;
    logoUrl?: string | null;
    offers: {
        id: string;
        title: string;
        discount: string;
        description: string;
        approval_status?: string;
    }[];
    previewSvg: string;
    previewLink: string;
    size: "a4" | "a5";
}) {
    const [colour, setColour] = useState<CardColour>(cardColourName(null));
    const [eyebrow, setEyebrow] = useState("");
    const [headline, setHeadline] = useState("");
    const [target, setTarget] = useState("business");
    // The line under the headline, which only an offer poster has. Null
    // means it hasn't been touched, so it follows the offer that is
    // chosen rather than keeping the first one's words.
    const [detail, setDetail] = useState<string | null>(null);

    // The poster says whatever the code opens. Pointed at the business
    // page it invites people in; pointed at an offer it sells that offer.
    // The preview and the placeholders follow the choice above them, so
    // what is on screen is what comes out of the printer.
    const chosenOffer = offers.find((option) => option.id === target) ?? null;
    const description = detail ?? chosenOffer?.description ?? "";

    const width = PREVIEW_WIDTH[size];

    return (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <form action={createQrCode} className="flex-1 space-y-5">
                <input type="hidden" name="businessId" value={businessId} />

                <div className="space-y-2">
                    <Label htmlFor="qr-label">Where will it go?</Label>
                    <Input
                        id="qr-label"
                        name="label"
                        required
                        minLength={2}
                        maxLength={60}
                        placeholder="Front window"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="qr-target">What should it open?</Label>
                    <select
                        id="qr-target"
                        name="target"
                        value={target}
                        onChange={(event) => {
                            setTarget(event.target.value);
                            setDetail(null);
                        }}
                        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                        <option value="business">Your business page</option>
                        {offers.map((option) => {
                            // An offer still being read can't be pointed at
                            // yet, but leaving it out of the list looks like
                            // we lost it. It is here, and it says why.
                            const waiting = option.approval_status === "pending";

                            return (
                                <option key={option.id} value={option.id} disabled={waiting}>
                                    Offer: {option.title}
                                    {waiting ? " — waiting for approval" : ""}
                                </option>
                            );
                        })}
                    </select>

                    {offers.some((option) => option.approval_status === "pending") && (
                        <p className="text-xs leading-5 text-muted-foreground">
                            An offer can be pointed at once it is approved,
                            usually the same day. We will email you.
                        </p>
                    )}
                </div>

                <PosterSizeSelect size={size} />

                <LoyaltyDesignPicker
                    colour={colour}
                    icon={DEFAULT_STAMP_ICON}
                    onColour={setColour}
                    onIcon={() => undefined}
                    showStamps={false}
                    colourLabel="Poster colour"
                />

                <div className="space-y-2">
                    <Label htmlFor="poster-eyebrow">Small line</Label>
                    <Input
                        id="poster-eyebrow"
                        name="posterEyebrow"
                        maxLength={40}
                        value={eyebrow}
                        onChange={(event) => setEyebrow(event.target.value)}
                        placeholder={chosenOffer ? "Exclusive offer" : "Scan for offers"}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="poster-headline">Headline</Label>
                    <Input
                        id="poster-headline"
                        name="posterHeadline"
                        maxLength={90}
                        value={headline}
                        onChange={(event) => setHeadline(event.target.value)}
                        placeholder={
                            chosenOffer
                                ? chosenOffer.discount
                                : `See what's on at ${businessName}`
                        }
                    />
                    <p className="text-xs leading-5 text-[#17233B]/65">
                        Leave both empty and the poster uses the words above.
                    </p>
                </div>

                {chosenOffer && (
                    <div className="space-y-2">
                        <Label htmlFor="poster-description">Description</Label>
                        <Textarea
                            id="poster-description"
                            name="posterDescription"
                            rows={3}
                            maxLength={140}
                            value={description}
                            onChange={(event) => setDetail(event.target.value)}
                        />
                        <p className="text-xs leading-5 text-[#17233B]/65">
                            The line under the headline. It starts as the offer&rsquo;s own
                            description — shorten it for a poster read from across the room.
                        </p>
                    </div>
                )}

                <input type="hidden" name="posterColour" value={colour} />

                <SubmitButton
                    size="lg"
                    pendingLabel="Creating…"
                    className="w-full bg-[#FF593F] text-white hover:bg-[#FF593F]/90 sm:w-auto"
                >
                    Create QR code
                </SubmitButton>
            </form>

            <div className="w-full shrink-0 lg:w-64">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17233B]/65">
                    What gets printed
                </p>

                <div
                    className="mt-3 overflow-hidden rounded-xl border border-[#17233B]/10 shadow-sm"
                    style={{ width }}
                >
                    <QrPoster
                        width={`${width}px`}
                        height={`${Math.round(width * (297 / 210))}px`}
                        fontSize={16 * (width / 794)}
                        businessName={businessName}
                        place={place}
                        logoUrl={logoUrl}
                        offer={chosenOffer}
                        qrMarkup={previewSvg}
                        link={previewLink}
                        colour={colour}
                        eyebrow={eyebrow}
                        headline={headline}
                        detail={description}
                    />
                </div>

                <p className="mt-3 text-xs leading-5 text-[#17233B]/65">
                    Ready to print. Your logo fills in automatically.
                </p>
            </div>
        </div>
    );
}
