"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    StepFrame,
} from "@/components/how-it-works-dialog";

function InviteArt() {
    return (
        <StepFrame>
            <rect x="14" y="22" width="44" height="30" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="2.2" />
            <path d="M14 27l22 14 22-14" fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx="55" cy="24" r="8" fill={CORAL} />
            <path d="M55 20.5v7M51.5 24h7" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        </StepFrame>
    );
}

function RoleArt() {
    return (
        <StepFrame>
            {[0, 1, 2].map((index) => (
                <g key={index}>
                    <circle
                        cx="22"
                        cy={21 + index * 15}
                        r="6"
                        fill={index === 0 ? CORAL : INK}
                        fillOpacity={index === 0 ? 1 : 0.12}
                    />
                    <rect
                        x="33"
                        y={18 + index * 15}
                        width={index === 0 ? 22 : index === 1 ? 17 : 13}
                        height="6"
                        rx="3"
                        fill={INK}
                        fillOpacity={index === 0 ? 0.3 : 0.15}
                    />
                </g>
            ))}
        </StepFrame>
    );
}

function AcceptArt() {
    return (
        <StepFrame>
            <rect x="15" y="14" width="34" height="42" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="22" width="20" height="3" rx="1.5" fill={INK} fillOpacity="0.3" />
            <rect x="21" y="29" width="14" height="3" rx="1.5" fill={INK} fillOpacity="0.2" />
            <rect x="21" y="38" width="18" height="7" rx="3.5" fill={CORAL} fillOpacity="0.25" />
            <circle cx="48" cy="46" r="13" fill={CORAL} />
            <path d="M42 46.5l4 4 8-9" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}

function WorkArt() {
    return (
        <StepFrame>
            <circle cx="27" cy="27" r="9" fill={CORAL} />
            <circle cx="45" cy="27" r="9" fill={INK} fillOpacity="0.15" />
            <path d="M14 52c0-7.2 5.8-13 13-13s13 5.8 13 13z" fill={CORAL} fillOpacity="0.3" />
            <path d="M32 52c0-7.2 5.8-13 13-13s13 5.8 13 13z" fill={INK} fillOpacity="0.1" />
        </StepFrame>
    );
}

function ChangeArt() {
    return (
        <StepFrame>
            <rect x="12" y="19" width="48" height="34" rx="8" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />

            <circle cx="23" cy="30" r="5" fill={INK} fillOpacity="0.15" />
            <rect x="32" y="27" width="12" height="6" rx="3" fill={INK} fillOpacity="0.15" />

            <circle cx="23" cy="43" r="5" fill={CORAL} fillOpacity="0.25" />
            <rect x="32" y="40" width="12" height="6" rx="3" fill={CORAL} fillOpacity="0.25" />

            <g stroke={CORAL} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M48 30h7" />
                <path d="M52 27l3 3-3 3" />
                <path d="M55 43h-7" />
                <path d="M51 40l-3 3 3 3" />
            </g>
        </StepFrame>
    );
}

const steps = [
    {
        art: <InviteArt />,
        title: "Send an invitation",
        body: "Enter the email of whoever helps you run the business. They get a link, and you can copy it to send yourself if the email does not arrive.",
    },
    {
        art: <RoleArt />,
        title: "Pick what they can do",
        body: "An owner runs everything including billing and the team. An admin manages offers, redemptions and the business page. A member helps day to day.",
    },
    {
        art: <AcceptArt />,
        title: "They accept the link",
        body: "They create a Promotello account, or sign in to the one they have, and join your business. The link expires, so an old one can't be reused.",
    },
    {
        art: <WorkArt />,
        title: "You share the work",
        body: "Everyone uses their own login, so stamps, redemptions and changes are recorded against the person who made them.",
    },
    {
        art: <ChangeArt />,
        title: "Change it any time",
        body: "Switch someone between admin and member, or remove them when they leave. Owners can also hand the business over to a new owner.",
    },
];

export function TeamHowItWorks() {
    return (
        <HowItWorksDialog
            title="How your team works"
            description="Inviting people, what each role can do, and changing it later."
            steps={steps}
        />
    );
}
