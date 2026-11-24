"use client";

import { CORAL, HowItWorksDialog, INK, StepFrame } from "@/components/how-it-works-dialog";

// A grid on the page, under the offers.
function GridArt() {
    return (
        <StepFrame>
            <rect x="12" y="14" width="48" height="44" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="18" y="20" width="20" height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
            {[0, 1, 2, 3].map((index) => (
                <rect
                    key={index}
                    x={18 + (index % 2) * 14}
                    y={28 + Math.floor(index / 2) * 13}
                    width="12"
                    height="11"
                    rx="2.5"
                    fill={index === 0 ? CORAL : INK}
                    fillOpacity={index === 0 ? 0.85 : 0.14}
                />
            ))}
        </StepFrame>
    );
}

// One tapped open, filling the screen.
function LightboxArt() {
    return (
        <StepFrame>
            <rect x="10" y="12" width="52" height="48" rx="6" fill={INK} fillOpacity="0.88" />
            <rect x="18" y="22" width="36" height="26" rx="4" fill={CORAL} fillOpacity="0.85" />
            <path d="M24 35h-4M52 35h-4" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="55" cy="18" r="1.8" fill="#FFFFFF" />
        </StepFrame>
    );
}

// Dragged into the order that matters.
function OrderArt() {
    return (
        <StepFrame>
            {[0, 1, 2].map((index) => (
                <rect
                    key={index}
                    x="16"
                    y={16 + index * 15}
                    width="40"
                    height="11"
                    rx="3"
                    fill="#FFFFFF"
                    stroke={index === 0 ? CORAL : INK}
                    strokeOpacity={index === 0 ? 1 : 0.15}
                    strokeWidth={index === 0 ? 2.2 : 1.4}
                />
            ))}
            <path d="M36 50v6m0 0l-3-3m3 3l3-3" stroke={CORAL} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <rect x="22" y="19" width="12" height="5" rx="2" fill={CORAL} fillOpacity="0.7" />
        </StepFrame>
    );
}

// What to point a camera at.
function SubjectArt() {
    return (
        <StepFrame>
            <rect x="12" y="20" width="48" height="34" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="2.2" />
            <circle cx="36" cy="37" r="9" fill="none" stroke={INK} strokeOpacity="0.3" strokeWidth="2.2" />
            <circle cx="36" cy="37" r="4" fill={CORAL} />
            <rect x="28" y="14" width="16" height="7" rx="2.5" fill={INK} fillOpacity="0.18" />
            <circle cx="52" cy="28" r="2" fill={INK} fillOpacity="0.25" />
        </StepFrame>
    );
}

const steps = [
    {
        art: <GridArt />,
        title: "They sit on your page, under your offers",
        body: "Somebody has read what you are offering and is deciding whether to walk over. The photos are what they look at next.",
    },
    {
        art: <LightboxArt />,
        title: "Tapping one fills the screen",
        body: "They open full size, and people swipe through the rest. A photo worth looking at twice earns you the second look.",
    },
    {
        art: <OrderArt />,
        title: "You choose the order",
        body: "Drag them. The first is the one almost everybody sees, and the last is the one almost nobody scrolls to -- so lead with the one that would make a stranger come in.",
    },
    {
        art: <SubjectArt />,
        title: "Shoot the place, not the logo",
        body: "The room with people in it, the counter, the thing you are known for, close and in daylight. A sign, a price list or a flyer tells somebody nothing they cannot already read on your page.",
    },
];

export function PhotosHowItWorks() {
    return (
        <HowItWorksDialog
            title="How your photos work"
            description="Where they show, who sees them, and what to point a camera at."
            steps={steps}
        />
    );
}
