"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    QrGlyph,
    StepFrame,
} from "@/components/how-it-works-dialog";

function SetUpArt() {
    return (
        <StepFrame>
            <rect x="14" y="18" width="44" height="36" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="14" y="18" width="44" height="11" rx="6" fill={INK} />
            <rect x="20" y="22" width="18" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.6" />
            {[0, 1, 2, 3].map((index) => (
                <circle
                    key={index}
                    cx={23 + index * 9}
                    cy={41}
                    r="4.2"
                    fill={index === 0 ? CORAL : "none"}
                    stroke={index === 0 ? CORAL : INK}
                    strokeOpacity={index === 0 ? 1 : 0.25}
                    strokeWidth="1.8"
                />
            ))}
            <rect x="20" y="49" width="20" height="2.6" rx="1.3" fill={INK} fillOpacity="0.2" />
        </StepFrame>
    );
}

function JoinArt() {
    return (
        <StepFrame>
            <rect x="23" y="10" width="30" height="52" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
            <rect x="34" y="14" width="8" height="2" rx="1" fill={INK} fillOpacity="0.3" />
            <rect x="28" y="21" width="20" height="13" rx="3" fill={INK} />
            <rect x="31" y="25" width="11" height="2.6" rx="1.3" fill="#FFFFFF" fillOpacity="0.6" />
            <rect x="28" y="39" width="20" height="9" rx="4" fill={CORAL} />
            <rect x="33" y="42" width="10" height="2.6" rx="1.3" fill="#FFFFFF" />
            <rect x="28" y="52" width="14" height="2.4" rx="1.2" fill={INK} fillOpacity="0.2" />
        </StepFrame>
    );
}

function StampArt() {
    return (
        <StepFrame>
            <rect x="11" y="24" width="26" height="26" rx="4" fill="#FFFFFF" stroke={INK} strokeOpacity="0.2" />
            <QrGlyph x={16} y={29} scale={0.52} />
            <rect x="40" y="12" width="24" height="44" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
            <rect x="48" y="16" width="8" height="2" rx="1" fill={INK} fillOpacity="0.3" />
            <g stroke={CORAL} strokeWidth="2.2" strokeLinecap="round" fill="none">
                <path d="M45 31v-3a2 2 0 0 1 2-2h3" />
                <path d="M59 31v-3a2 2 0 0 0-2-2h-3" />
                <path d="M45 41v3a2 2 0 0 0 2 2h3" />
                <path d="M59 41v3a2 2 0 0 1-2 2h-3" />
            </g>
            <rect x="44" y="35" width="16" height="2.4" rx="1.2" fill={CORAL} />
        </StepFrame>
    );
}

function FillArt() {
    return (
        <StepFrame>
            <rect x="10" y="25" width="52" height="22" rx="8" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            {[0, 1, 2, 3, 4].map((index) => (
                <circle
                    key={index}
                    cx={17 + index * 9.5}
                    cy={36}
                    r="3.8"
                    fill={index < 4 ? CORAL : "none"}
                    stroke={index < 4 ? CORAL : INK}
                    strokeOpacity={index < 4 ? 1 : 0.3}
                    strokeWidth="1.8"
                    strokeDasharray={index < 4 ? undefined : "2.5 2.5"}
                />
            ))}
        </StepFrame>
    );
}

function RewardArt() {
    return (
        <StepFrame>
            <rect x="16" y="28" width="40" height="26" rx="5" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="16" y="28" width="40" height="9" rx="4" fill={CORAL} />
            <rect x="33" y="28" width="6" height="26" fill={CORAL} fillOpacity="0.25" />
            <path d="M36 28c-5 0-8-3-8-6a4 4 0 0 1 8 2 4 4 0 0 1 8-2c0 3-3 6-8 6z" fill={CORAL} />
            <circle cx="52" cy="50" r="10" fill={INK} />
            <path d="M47 50.5l3.4 3.4 6.2-6.8" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}

const steps = [
    {
        art: <SetUpArt />,
        title: "Set up the card",
        body: "Choose how many stamps it takes and what the reward is. The preview beside the form is the card your customers will carry.",
    },
    {
        art: <JoinArt />,
        title: "Customers join",
        body: "They tap join on your business page and the card lands in their Promotello account. No app, no plastic card to lose.",
    },
    {
        art: <StampArt />,
        title: "You add a stamp",
        body: "Scan the QR on their card with your phone, or type the code. Only you can add stamps, so nobody can stamp their own.",
    },
    {
        art: <FillArt />,
        title: "They keep coming back",
        body: "Each visit fills another stamp. Seeing the card nearly full is what brings people back rather than going somewhere else.",
    },
    {
        art: <RewardArt />,
        title: "The reward is claimed",
        body: "On the last stamp their card shows Reward ready. Hand over the reward, mark it redeemed, and the card starts again.",
    },
];

export function LoyaltyHowItWorks() {
    return (
        <HowItWorksDialog
            title="How loyalty cards work"
            description="From setting up a stamp card to handing over the reward."
            steps={steps}
        />
    );
}
