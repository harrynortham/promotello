"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    QrGlyph,
    StepFrame,
} from "@/components/how-it-works-dialog";
import { OfferListedArt, OfferWriteArt } from "@/components/step-art";

function ReviewArt() {
    return (
        <StepFrame>
            <rect x="15" y="13" width="34" height="42" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="21" width="20" height="3" rx="1.5" fill={INK} fillOpacity="0.3" />
            <rect x="21" y="28" width="14" height="3" rx="1.5" fill={INK} fillOpacity="0.2" />
            <rect x="21" y="35" width="18" height="3" rx="1.5" fill={INK} fillOpacity="0.2" />
            <circle cx="48" cy="46" r="13" fill={CORAL} />
            <path d="M42 46.5l4 4 8-9" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}

function ClaimArt() {
    return (
        <StepFrame>
            {/* A voucher with a notch on each side, like a ticket. */}
            <path
                d="M14 20h44v12a5 5 0 0 0 0 10v12H14V42a5 5 0 0 0 0-10z"
                fill="#FFFFFF"
                stroke={INK}
                strokeOpacity="0.18"
            />
            <QrGlyph x={19} y={26} scale={0.62} />
            <rect x="40" y="29" width="13" height="3" rx="1.5" fill={CORAL} />
            <rect x="40" y="37" width="11" height="2.6" rx="1.3" fill={INK} fillOpacity="0.3" />
            <rect x="40" y="44" width="13" height="2.6" rx="1.3" fill={INK} fillOpacity="0.2" />
        </StepFrame>
    );
}

function RedeemArt() {
    return (
        <StepFrame>
            <rect x="11" y="22" width="26" height="28" rx="4" fill="#FFFFFF" stroke={INK} strokeOpacity="0.2" />
            <QrGlyph x={16} y={27} scale={0.56} />
            <rect x="38" y="12" width="26" height="46" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
            <rect x="47" y="16" width="8" height="2" rx="1" fill={INK} fillOpacity="0.3" />
            <circle cx="51" cy="37" r="11" fill={CORAL} />
            <path d="M46 37.5l3.5 3.5 7-7.5" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}

const steps = [
    {
        art: <OfferWriteArt />,
        title: "Write the offer",
        body: "A title, the discount, when it ends and a photo. The preview beside the form shows exactly how it will look to customers.",
    },
    {
        art: <ReviewArt />,
        title: "We check it over",
        body: "Every offer is read by our team before customers see it, usually the same day. It keeps the directory worth browsing, so your offer sits in good company.",
    },
    {
        art: <OfferListedArt />,
        title: "It goes live",
        body: "Your offer appears on your business page and in the Promotello directory, where people nearby are browsing for something to try.",
    },
    {
        art: <ClaimArt />,
        title: "Customers claim it",
        body: "Claiming saves a voucher to their phone with its own code and QR. Followers get an email when you post something new.",
    },
    {
        art: <RedeemArt />,
        title: "You redeem it",
        body: "Scan their voucher at the till, or type the code on the Redemptions page, and it is marked used so it can't be claimed twice.",
    },
];

export function OffersHowItWorks() {
    return (
        <HowItWorksDialog
            title="How offers work"
            description="From writing an offer to redeeming it at the till."
            steps={steps}
        />
    );
}
