"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    QrGlyph,
    StepFrame,
} from "@/components/how-it-works-dialog";
import { RedeemMarkArt, RedeemScanArt } from "@/components/step-art";

function ClaimArt() {
    return (
        <StepFrame>
            <rect x="23" y="10" width="30" height="52" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
            <rect x="34" y="14" width="8" height="2" rx="1" fill={INK} fillOpacity="0.3" />
            <rect x="28" y="21" width="20" height="13" rx="3" fill={CORAL} fillOpacity="0.2" />
            <rect x="31" y="25" width="10" height="4" rx="2" fill={CORAL} />
            <rect x="28" y="39" width="20" height="9" rx="4" fill={CORAL} />
            <rect x="33" y="42" width="10" height="2.6" rx="1.3" fill="#FFFFFF" />
            <rect x="28" y="52" width="13" height="2.4" rx="1.2" fill={INK} fillOpacity="0.2" />
        </StepFrame>
    );
}

function ShowArt() {
    return (
        <StepFrame>
            <rect x="21" y="12" width="30" height="48" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
            <rect x="32" y="16" width="8" height="2" rx="1" fill={INK} fillOpacity="0.3" />
            <rect x="26" y="22" width="20" height="20" rx="3" fill="#FFF8F0" />
            <QrGlyph x={29} y={25} scale={0.53} />
            <rect x="27" y="47" width="18" height="3" rx="1.5" fill={INK} fillOpacity="0.45" />
            <rect x="30" y="53" width="12" height="2.4" rx="1.2" fill={INK} fillOpacity="0.2" />
        </StepFrame>
    );
}

function OnceArt() {
    return (
        <StepFrame>
            <rect x="16" y="24" width="40" height="26" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <QrGlyph x={21} y={30} scale={0.5} />
            <rect x="38" y="32" width="12" height="2.8" rx="1.4" fill={INK} fillOpacity="0.2" />
            <rect x="38" y="39" width="9" height="2.8" rx="1.4" fill={INK} fillOpacity="0.15" />
            <path d="M22 50L52 24" stroke={CORAL} strokeWidth="3" strokeLinecap="round" />
        </StepFrame>
    );
}

const steps = [
    {
        art: <ClaimArt />,
        title: "A customer claims an offer",
        body: "They tap claim on your offer, in the directory or on your business page. Nothing is paid up front.",
    },
    {
        art: <ShowArt />,
        title: "They get a voucher",
        body: "It is saved in their Promotello account with its own ten-character code and a QR code, ready to show at the till.",
    },
    {
        art: <RedeemScanArt />,
        title: "You scan it",
        body: "Point your phone camera at the QR on their voucher. It opens that voucher for you, with the offer and whether it is still valid.",
    },
    {
        art: <RedeemMarkArt />,
        title: "Mark it used",
        body: "One tap records the redemption. No camera to hand? Find the offer on this page and mark it used from its card.",
    },
    {
        art: <OnceArt />,
        title: "It can't be used twice",
        body: "A used voucher is closed for good, and every redemption is listed here with the date, so your records match the till.",
    },
];

export function RedemptionsHowItWorks() {
    return (
        <HowItWorksDialog
            title="How redemptions work"
            description="From a customer claiming an offer to marking it used at the till."
            steps={steps}
        />
    );
}
