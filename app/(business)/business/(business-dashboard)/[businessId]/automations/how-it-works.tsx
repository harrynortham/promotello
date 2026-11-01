"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    QrGlyph,
    StepFrame,
} from "@/components/how-it-works-dialog";

function ChooseArt() {
    return (
        <StepFrame>
            {[0, 1, 2].map((index) => (
                <g key={index}>
                    <rect
                        x="13"
                        y={15 + index * 15}
                        width="46"
                        height="12"
                        rx="4"
                        fill="#FFFFFF"
                        stroke={INK}
                        strokeOpacity="0.15"
                    />
                    <rect x="19" y={19 + index * 15} width={index === 2 ? 16 : 22} height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
                    <rect
                        x="44"
                        y={18 + index * 15}
                        width="11"
                        height="6"
                        rx="3"
                        fill={index === 0 ? CORAL : INK}
                        fillOpacity={index === 0 ? 1 : 0.12}
                    />
                    {index === 0 && <circle cx="52" cy="21" r="2" fill="#FFFFFF" />}
                </g>
            ))}
        </StepFrame>
    );
}

function TriggerArt() {
    return (
        <StepFrame>
            <circle cx="36" cy="36" r="20" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <circle cx="36" cy="36" r="20" fill="none" stroke={CORAL} strokeWidth="3" strokeLinecap="round" strokeDasharray="33 92" />
            <path d="M36 25v11l7 5" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="36" cy="36" r="2.4" fill={CORAL} />
        </StepFrame>
    );
}

function EmailArt() {
    return (
        <StepFrame>
            <rect x="12" y="20" width="48" height="32" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="2.2" />
            <path d="M12 25l24 15 24-15" fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx="54" cy="22" r="8" fill={CORAL} />
            <path d="M54 18.5v7M50.5 22h7" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        </StepFrame>
    );
}

function VoucherArt() {
    return (
        <StepFrame>
            <path
                d="M14 22h44v10a5 5 0 0 0 0 10v10H14V42a5 5 0 0 0 0-10z"
                fill="#FFFFFF"
                stroke={INK}
                strokeOpacity="0.18"
            />
            <QrGlyph x={19} y={27} scale={0.6} />
            <rect x="40" y="30" width="14" height="3" rx="1.5" fill={CORAL} />
            <rect x="40" y="38" width="11" height="2.6" rx="1.3" fill={INK} fillOpacity="0.3" />
            <rect x="40" y="45" width="14" height="2.6" rx="1.3" fill={INK} fillOpacity="0.2" />
        </StepFrame>
    );
}

function ResultArt() {
    return (
        <StepFrame>
            <rect x="14" y="16" width="44" height="40" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="24" width="18" height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
            <rect x="21" y="38" width="7" height="11" rx="2" fill={INK} fillOpacity="0.3" />
            <rect x="32" y="33" width="7" height="16" rx="2" fill={CORAL} fillOpacity="0.5" />
            <rect x="43" y="28" width="7" height="21" rx="2" fill={CORAL} />
        </StepFrame>
    );
}

const steps = [
    {
        art: <ChooseArt />,
        title: "Switch one on",
        body: "Welcome, birthday and win-back. Each is a separate switch, so you can start with one and add the others later.",
    },
    {
        art: <TriggerArt />,
        title: "Set what sets it off",
        body: "A welcome goes out when someone follows you, a birthday on their day, and a win-back after a customer has not visited for a while.",
    },
    {
        art: <EmailArt />,
        title: "The email sends itself",
        body: "No list to manage and nothing to remember. Promotello sends it from your business, with your name and reward on it.",
    },
    {
        art: <VoucherArt />,
        title: "They get a personal reward",
        body: "Each email carries a voucher for that customer only, with its own code and QR, and it can be used once.",
    },
    {
        art: <ResultArt />,
        title: "You see what came back",
        body: "Every automation shows how many rewards went out and how many were redeemed, so you can tell which ones are worth keeping.",
    },
];

export function AutomationsHowItWorks() {
    return (
        <HowItWorksDialog
            title="How automations work"
            description="Emails that go out on their own, each carrying a reward you can track."
            steps={steps}
        />
    );
}
