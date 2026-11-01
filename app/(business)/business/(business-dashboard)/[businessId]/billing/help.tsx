"use client";

import {
    CORAL,
    HowItWorksDialog,
    INK,
    StepFrame,
} from "@/components/how-it-works-dialog";
import { company } from "@/lib/legal";

function PlanArt() {
    return (
        <StepFrame>
            <rect x="13" y="20" width="21" height="32" rx="5" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="18" y="26" width="11" height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
            <rect x="18" y="33" width="8" height="3" rx="1.5" fill={INK} fillOpacity="0.15" />
            <rect x="38" y="16" width="21" height="40" rx="5" fill="#FFFFFF" stroke={CORAL} strokeWidth="2" />
            <rect x="43" y="23" width="11" height="3" rx="1.5" fill={CORAL} />
            <rect x="43" y="30" width="8" height="3" rx="1.5" fill={INK} fillOpacity="0.2" />
            <circle cx="48.5" cy="45" r="6" fill={CORAL} />
            <path d="M45.5 45.3l2 2 4-4.6" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}

function TrialArt() {
    return (
        <StepFrame>
            <circle cx="36" cy="36" r="20" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <circle cx="36" cy="36" r="20" fill="none" stroke={CORAL} strokeWidth="3" strokeLinecap="round" strokeDasharray="94 32" transform="rotate(-90 36 36)" />
            <path d="M36 26v11l7 4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}

function CardArt() {
    return (
        <StepFrame>
            <rect x="12" y="23" width="48" height="30" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="12" y="29" width="48" height="7" fill={INK} />
            <rect x="18" y="42" width="16" height="3.4" rx="1.7" fill={INK} fillOpacity="0.2" />
            <circle cx="47" cy="44" r="5" fill={CORAL} fillOpacity="0.45" />
            <circle cx="53" cy="44" r="5" fill={CORAL} />
        </StepFrame>
    );
}

function InvoiceArt() {
    return (
        <StepFrame>
            <rect x="19" y="12" width="34" height="44" rx="5" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="25" y="20" width="18" height="3" rx="1.5" fill={INK} fillOpacity="0.3" />
            <rect x="25" y="28" width="22" height="2.6" rx="1.3" fill={INK} fillOpacity="0.15" />
            <rect x="25" y="35" width="22" height="2.6" rx="1.3" fill={INK} fillOpacity="0.15" />
            <rect x="25" y="44" width="13" height="4" rx="2" fill={CORAL} />
            <path d="M36 58v5m0 0l-3-3m3 3l3-3" stroke={CORAL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}

function CancelArt() {
    return (
        <StepFrame>
            <rect x="14" y="20" width="44" height="32" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="28" width="18" height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
            <rect x="21" y="38" width="30" height="6" rx="3" fill={INK} fillOpacity="0.1" />
            <rect x="21" y="38" width="20" height="6" rx="3" fill={CORAL} fillOpacity="0.5" />
            <circle cx="52" cy="24" r="9" fill={INK} />
            <path d="M48.5 24h7" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
        </StepFrame>
    );
}

const steps = [
    {
        art: <PlanArt />,
        title: "Changing plan",
        body: "Choose a plan below and Stripe adjusts your next invoice for the difference. Moving up takes effect straight away.",
    },
    {
        art: <TrialArt />,
        title: "Your free trial",
        body: "The trial runs for 30 days and your first payment is taken the day it ends. Cancel before then and you are not charged.",
    },
    {
        art: <CardArt />,
        title: "Card and billing details",
        body: "Manage billing opens Stripe, where you can change the card, the billing email and your address. Promotello never sees your card number.",
    },
    {
        art: <InvoiceArt />,
        title: "Invoices and receipts",
        body: "View past invoices opens the same place, with every invoice as a PDF for your accounts.",
    },
    {
        art: <CancelArt />,
        title: "Cancelling",
        body: "Cancel in Stripe and you keep your plan until the end of the period you have paid for. Your offers stay live until then.",
    },
];

export function BillingHelp() {
    return (
        <HowItWorksDialog
            label="Help"
            title="Billing help"
            description="Plans, payments and invoices, and how to reach us."
            numbered={false}
            steps={steps}
            footer={
                <div className="rounded-xl border border-[#FF593F]/30 bg-[#FF593F]/5 p-4">
                    <p className="font-semibold text-[#17233B]">
                        Still stuck?
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                        Email{" "}
                        <a
                            href={`mailto:${company.supportEmail}?subject=Billing%20help`}
                            className="font-medium text-[#FF593F] underline underline-offset-4"
                        >
                            {company.supportEmail}
                        </a>{" "}
                        with your business name and we will look into it.
                    </p>
                </div>
            }
        />
    );
}
