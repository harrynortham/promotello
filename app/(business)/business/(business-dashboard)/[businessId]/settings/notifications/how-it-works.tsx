"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    StepFrame,
} from "@/components/how-it-works-dialog";

function SwitchArt() {
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
                    <rect x="19" y={19 + index * 15} width={index === 1 ? 16 : 22} height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
                    <rect
                        x="44"
                        y={18 + index * 15}
                        width="11"
                        height="6"
                        rx="3"
                        fill={index === 1 ? INK : CORAL}
                        fillOpacity={index === 1 ? 0.12 : 1}
                    />
                    <circle cx={index === 1 ? 47 : 52} cy={21 + index * 15} r="2" fill={index === 1 ? "#FFFFFF" : "#FFFFFF"} />
                </g>
            ))}
        </StepFrame>
    );
}

function SummaryArt() {
    return (
        <StepFrame>
            <rect x="14" y="18" width="44" height="38" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="2.2" />
            <path d="M14 23l22 13 22-13" fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
            <rect x="22" y="40" width="7" height="8" rx="2" fill={INK} fillOpacity="0.25" />
            <rect x="32" y="36" width="7" height="12" rx="2" fill={CORAL} fillOpacity="0.5" />
            <rect x="42" y="32" width="7" height="16" rx="2" fill={CORAL} />
        </StepFrame>
    );
}

function SoldOutArt() {
    return (
        <StepFrame>
            <rect x="14" y="20" width="44" height="32" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="28" width="20" height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
            <rect x="21" y="38" width="30" height="6" rx="3" fill={INK} fillOpacity="0.1" />
            <rect x="21" y="38" width="30" height="6" rx="3" fill={CORAL} />
            <circle cx="52" cy="22" r="9" fill={CORAL} />
            <path d="M52 17.5v6" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="52" cy="26.5" r="1.4" fill="#FFFFFF" />
        </StepFrame>
    );
}

function ThresholdArt() {
    return (
        <StepFrame>
            <rect x="14" y="22" width="44" height="28" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="32" width="30" height="7" rx="3.5" fill={INK} fillOpacity="0.1" />
            <rect x="21" y="32" width="11" height="7" rx="3.5" fill={CORAL} />
            <path d="M36 26v20" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" strokeOpacity="0.5" />
            <circle cx="36" cy="26" r="3" fill={INK} fillOpacity="0.5" />
        </StepFrame>
    );
}

function InboxArt() {
    return (
        <StepFrame>
            <rect x="14" y="16" width="44" height="40" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="24" width="30" height="8" rx="3" fill={CORAL} fillOpacity="0.2" />
            <rect x="25" y="27" width="14" height="2.6" rx="1.3" fill={CORAL} />
            <rect x="21" y="36" width="30" height="7" rx="3" fill={INK} fillOpacity="0.08" />
            <rect x="25" y="38.5" width="18" height="2.4" rx="1.2" fill={INK} fillOpacity="0.3" />
            <rect x="21" y="46" width="30" height="7" rx="3" fill={INK} fillOpacity="0.08" />
            <rect x="25" y="48.5" width="12" height="2.4" rx="1.2" fill={INK} fillOpacity="0.3" />
        </StepFrame>
    );
}

const steps = [
    {
        art: <SwitchArt />,
        title: "Choose what reaches you",
        body: "Three separate switches. Turn on the ones worth interrupting your day and leave the rest off; nothing else is emailed to you.",
    },
    {
        art: <SummaryArt />,
        title: "The daily summary",
        body: "One email a day with the claims and redemptions from the day before, so you can see how an offer is going without opening the dashboard.",
    },
    {
        art: <SoldOutArt />,
        title: "Fully claimed alerts",
        body: "If an offer has a redemption limit, you are told the moment the last one goes, so customers are not seeing something they cannot claim.",
    },
    {
        art: <ThresholdArt />,
        title: "Low inventory warnings",
        body: "Set a number and you are warned as a limited offer gets close to it, in time to raise the limit or plan the next offer.",
    },
    {
        art: <InboxArt />,
        title: "Where they go",
        body: "Emails go to the address on your Promotello account. These are for running the business and are separate from your own account notifications.",
    },
];

export function NotificationsHowItWorks() {
    return (
        <HowItWorksDialog
            title="How notifications work"
            description="What each alert tells you, and when it arrives."
            steps={steps}
        />
    );
}
