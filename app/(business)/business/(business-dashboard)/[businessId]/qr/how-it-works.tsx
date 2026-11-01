"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    QrGlyph,
    StepFrame,
} from "@/components/how-it-works-dialog";
import { QrPrintArt } from "@/components/step-art";

function CreateArt() {
    return (
        <StepFrame>
            <rect x="18" y="14" width="36" height="36" rx="7" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <QrGlyph x={24} y={20} scale={0.95} />
            <circle cx="52" cy="50" r="11" fill={CORAL} />
            <path d="M52 45v10M47 50h10" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
        </StepFrame>
    );
}

function DisplayArt() {
    return (
        <StepFrame>
            {/* A shop window with the poster in it. */}
            <path d="M14 26l6-10h32l6 10z" fill={CORAL} fillOpacity="0.25" />
            <rect x="14" y="26" width="44" height="32" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
            <rect x="24" y="32" width="24" height="20" rx="3" fill="#FFF8F0" stroke={INK} strokeOpacity="0.2" />
            <QrGlyph x={28} y={35} scale={0.56} />
            <rect x="14" y="56" width="44" height="3" rx="1.5" fill={INK} />
        </StepFrame>
    );
}

function ScanArt() {
    return (
        <StepFrame>
            <rect x="12" y="20" width="28" height="32" rx="4" fill="#FFFFFF" stroke={INK} strokeOpacity="0.2" />
            <QrGlyph x={17} y={26} scale={0.62} />
            <rect x="38" y="12" width="26" height="46" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
            <rect x="47" y="16" width="8" height="2" rx="1" fill={INK} fillOpacity="0.3" />
            <g stroke={CORAL} strokeWidth="2.2" strokeLinecap="round" fill="none">
                <path d="M44 32v-3a2 2 0 0 1 2-2h3" />
                <path d="M58 32v-3a2 2 0 0 0-2-2h-3" />
                <path d="M44 42v3a2 2 0 0 0 2 2h3" />
                <path d="M58 42v3a2 2 0 0 1-2 2h-3" />
            </g>
            <rect x="43" y="36" width="16" height="2.4" rx="1.2" fill={CORAL} />
        </StepFrame>
    );
}

function TrackArt() {
    return (
        <StepFrame>
            <rect x="14" y="16" width="44" height="40" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="38" width="7" height="11" rx="2" fill={INK} fillOpacity="0.25" />
            <rect x="32" y="31" width="7" height="18" rx="2" fill={INK} fillOpacity="0.4" />
            <rect x="43" y="23" width="7" height="26" rx="2" fill={CORAL} />
            <path d="M21 30l11-6 11-8" stroke={CORAL} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" fill="none" />
        </StepFrame>
    );
}

const steps = [
    {
        art: <CreateArt />,
        title: "Create a code",
        body: "Name it for the spot it will live in, like Front window, and choose whether it opens your business page or one offer.",
    },
    {
        art: <QrPrintArt />,
        title: "Print the poster",
        body: "Every code comes with a ready-made A4 or A5 poster carrying your logo and your newest offer. Print it, or save it as a PDF.",
    },
    {
        art: <DisplayArt />,
        title: "Put it where people look",
        body: "Your window, by the till, on tables. One code per spot tells you which places actually bring people in.",
    },
    {
        art: <ScanArt />,
        title: "Customers scan it",
        body: "Any phone camera opens the page. No app to download, and they can claim the offer there and then.",
    },
    {
        art: <TrackArt />,
        title: "See what works",
        body: "Each scan is counted against its code, so you can compare placements over 7 days, 30 days and all time.",
    },
];

export function QrHowItWorks() {
    return (
        <HowItWorksDialog
            title="How QR posters work"
            description="From printing a poster to seeing which spot brings the most people in."
            steps={steps}
        />
    );
}
