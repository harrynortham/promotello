"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    StepFrame,
} from "@/components/how-it-works-dialog";

function FunnelArt() {
    return (
        <StepFrame>
            <rect x="15" y="17" width="42" height="9" rx="4.5" fill={INK} fillOpacity="0.2" />
            <rect x="20" y="31" width="32" height="9" rx="4.5" fill={CORAL} fillOpacity="0.45" />
            <rect x="26" y="45" width="20" height="9" rx="4.5" fill={CORAL} />
            <path d="M36 27v3M36 41v3" stroke={INK} strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
        </StepFrame>
    );
}

function PeriodArt() {
    return (
        <StepFrame>
            <rect x="14" y="18" width="44" height="38" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="14" y="18" width="44" height="10" rx="6" fill={INK} />
            <rect x="20" y="22" width="9" height="2.6" rx="1.3" fill="#FFFFFF" fillOpacity="0.6" />
            {[0, 1, 2, 3].map((column) =>
                [0, 1].map((row) => (
                    <rect
                        key={`${column}-${row}`}
                        x={20 + column * 9}
                        y={34 + row * 9}
                        width="6"
                        height="6"
                        rx="1.6"
                        fill={column === 3 && row === 1 ? CORAL : INK}
                        fillOpacity={column === 3 && row === 1 ? 1 : 0.12}
                    />
                )),
            )}
        </StepFrame>
    );
}

function CompareArt() {
    return (
        <StepFrame>
            <rect x="14" y="16" width="44" height="40" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="40" width="7" height="9" rx="2" fill={INK} fillOpacity="0.25" />
            <rect x="32" y="32" width="7" height="17" rx="2" fill={INK} fillOpacity="0.4" />
            <rect x="43" y="24" width="7" height="25" rx="2" fill={CORAL} />
            <path d="M21 33l11-6 11-8" stroke={CORAL} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" fill="none" />
        </StepFrame>
    );
}

function OfferRowsArt() {
    return (
        <StepFrame>
            {[0, 1, 2].map((index) => (
                <g key={index}>
                    <rect
                        x="13"
                        y={17 + index * 14}
                        width="46"
                        height="11"
                        rx="4"
                        fill="#FFFFFF"
                        stroke={INK}
                        strokeOpacity="0.15"
                    />
                    <rect x="18" y={21 + index * 14} width="14" height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
                    <rect
                        x="36"
                        y={21 + index * 14}
                        width={index === 0 ? 18 : index === 1 ? 11 : 6}
                        height="3"
                        rx="1.5"
                        fill={CORAL}
                        fillOpacity={index === 0 ? 1 : index === 1 ? 0.6 : 0.3}
                    />
                </g>
            ))}
        </StepFrame>
    );
}

function ActArt() {
    return (
        <StepFrame>
            <circle cx="36" cy="36" r="20" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <circle cx="36" cy="36" r="20" fill="none" stroke={CORAL} strokeWidth="3" strokeLinecap="round" strokeDasharray="88 38" transform="rotate(-90 36 36)" />
            <path d="M30 36.5l4 4 9-10" stroke={CORAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}

const steps = [
    {
        art: <FunnelArt />,
        title: "Follow one journey",
        body: "Someone sees your page, claims a voucher, then uses it in store. Each step is counted separately, so you can see where people drop off.",
    },
    {
        art: <PeriodArt />,
        title: "This period, against the last",
        body: "The tiles at the top compare the current period with the one before it, so a number means something without you keeping notes.",
    },
    {
        art: <CompareArt />,
        title: "Where people come from",
        body: "Page views, QR poster scans, loyalty stamps and Google review clicks are tracked separately, so you can tell print from online.",
    },
    {
        art: <OfferRowsArt />,
        title: "Offer by offer",
        body: "Every offer shows its claims, how many were used and how close it is to its limit, so your strongest offer is obvious.",
    },
    {
        art: <ActArt />,
        title: "Do more of what works",
        body: "Claims that are never used point at the handover in store. Plenty of views but few claims usually means the offer needs rewording.",
    },
];

export function AnalyticsHowItWorks() {
    return (
        <HowItWorksDialog
            title="How to read your analytics"
            description="What each number counts, and what to do about it."
            steps={steps}
        />
    );
}
