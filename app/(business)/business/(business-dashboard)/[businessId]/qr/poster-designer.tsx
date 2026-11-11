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

// A4 is 794px wide at 96dpi, and the preview is a quarter of that. The
// paper size is chosen on the print page itself, where the sheet is in
// front of you — asking twice only invited the two to disagree.
const PREVIEW_WIDTH = 256;

// The create form and the poster it will print, side by side, so the
// colour and the words can be seen before the code exists.
export function PosterDesigner({
    businessId,
    businessName,
    place,
    logoUrl,
    offers,
    loyalty,
    previewSvg,
    previewLink,
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
    // The card being handed out, if there is one. A poster by the till
    // is the strongest thing a business has for it.
    loyalty: { id: string; name: string; stamps_required: number; reward: string; terms: string | null } | null;
    previewSvg: string;
    previewLink: string;
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
    const chosenLoyalty = target === "loyalty" ? loyalty : null;

    // What the poster says when the business hasn't written its own
    // words: the offer's, the card's, or the business page's.
    const suggestedEyebrow = chosenLoyalty
        ? `Collect ${chosenLoyalty.stamps_required} stamps`
        : chosenOffer
            ? "Exclusive offer"
            : "Scan for offers";

    const suggestedHeadline = chosenLoyalty
        ? `Get ${chosenLoyalty.reward.charAt(0).toLowerCase() + chosenLoyalty.reward.slice(1)}`
        : chosenOffer
            ? chosenOffer.discount
            : `See what's on at ${businessName}`;

    const description = detail ?? chosenOffer?.description ?? chosenLoyalty?.terms ?? "";

    const width = PREVIEW_WIDTH;

    return (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <form action={createQrCode} className="flex-1 space-y-5">
                <input type="hidden" name="businessId" value={businessId} />
                {chosenLoyalty && (
                    <input type="hidden" name="loyaltyProgramId" value={chosenLoyalty.id} />
                )}

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
                        {loyalty && (
                            <option value="loyalty">Loyalty card: {loyalty.name}</option>
                        )}
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
                        placeholder={suggestedEyebrow}
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
                        placeholder={suggestedHeadline}
                    />
                    <p className="text-xs leading-5 text-[#17233B]/65">
                        Leave both empty and the poster uses the words above.
                    </p>
                </div>

                {(chosenOffer || chosenLoyalty) && (
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
                            The line under the headline. It starts as the{" "}
                            {chosenLoyalty ? "card's own terms" : "offer's own description"} —
                            shorten it for a poster read from across the room.
                        </p>
                    </div>
                )}

                <input type="hidden" name="posterColour" value={colour} />

                <SubmitButton
                    size="lg"
                    pendingLabel="Creating…"
                    className="w-full bg-[#FF593F] text-white hover:bg-[#FF593F]/90 sm:w-auto"
                >
                    Make this poster
                </SubmitButton>
            </form>

            {/* top-24 clears the site header, which is sticky and 80px
                tall, so the poster isn't half under it. */}
            <div className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64">
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
                        offer={
                            chosenOffer ??
                            (chosenLoyalty
                                ? { discount: suggestedHeadline, description: chosenLoyalty.terms }
                                : null)
                        }
                        eyebrowFallback={suggestedEyebrow}
                        caption={
                            chosenLoyalty
                                ? "Join free on Promotello and collect a stamp every time you visit."
                                : null
                        }
                        qrMarkup={previewSvg}
                        link={previewLink}
                        colour={colour}
                        eyebrow={eyebrow}
                        headline={headline}
                        detail={description}
                    />
                </div>

                {/* The poster is the obvious thing here, so the code on
                    its own needs saying: the download buttons sit beside
                    each code further down the page, where nobody about to
                    print a poster is looking. */}
                <p className="mt-3 text-xs leading-5 text-[#17233B]/65">
                    Ready to print, with your logo filled in. You also get
                    the code on its own — as an image or a print-shop file
                    — for a menu, a sticker or a leaflet.
                </p>
            </div>
        </div>
    );
}
