import type { Metadata } from "next";

import {
    LegalDocument,
    type LegalSection,
} from "@/components/legal-document";

export const metadata: Metadata = {
    title: "Terms of Service | Promotello",
    description: "Terms governing the use of Promotello.",
    robots: { index: false, follow: true },
};

const sections: LegalSection[] = [
    {
        id: "introduction",
        title: "About these terms",
        content: (
            <p>
                [Identify the operator, who these terms apply to, and how
                separate business terms apply.]
            </p>
        ),
    },
    {
        id: "accounts",
        title: "Accounts and eligibility",
        content: (
            <p>
                [Explain eligibility, account registration, security, and user
                responsibilities.]
            </p>
        ),
    },
    {
        id: "promotions",
        title: "Promotions and availability",
        content: (
            <p>
                [Explain promotion information, availability, claim limits,
                expiry, and the role of participating businesses.]
            </p>
        ),
    },
    {
        id: "redemptions",
        title: "Claiming and using promotions",
        content: (
            <p>
                [Explain redemption codes, applicable offer terms, fulfilment,
                and how customers can raise an issue.]
            </p>
        ),
    },
    {
        id: "acceptable-use",
        title: "Acceptable use",
        content: (
            <p>
                [Describe prohibited behaviour, including misuse of accounts,
                codes, and platform functionality.]
            </p>
        ),
    },
    {
        id: "responsibilities",
        title: "Responsibilities and liability",
        content: (
            <p>
                [Explain platform and business responsibilities, applicable
                limitations, and statutory rights.]
            </p>
        ),
    },
    {
        id: "suspension",
        title: "Suspension and account closure",
        content: (
            <p>
                [Explain grounds and procedures for suspension, termination,
                and account closure.]
            </p>
        ),
    },
    {
        id: "disputes",
        title: "Contact, disputes, and changes",
        content: (
            <p>
                [Provide contact details, dispute procedures, applicable law,
                and how changes to these terms are handled.]
            </p>
        ),
    },
];

export default function TermsPage() {
    return (
        <LegalDocument
            title="Terms of service"
            description="The terms that apply when you access and use Promotello."
            updatedAt="To be confirmed"
            version="Draft"
            draft
            sections={sections}
        />
    );
}