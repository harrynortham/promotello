import type { Metadata } from "next";

import {
    LegalDocument,
    type LegalSection,
} from "@/components/legal-document";

export const metadata: Metadata = {
    title: "Privacy Policy | Promotello",
    description: "Information about how Promotello handles personal data.",
    robots: { index: false, follow: true },
};

const sections: LegalSection[] = [
    {
        id: "who-we-are",
        title: "Who we are",
        content: (
            <p>
                [Insert the legal entity operating Promotello, its address,
                and privacy contact details.]
            </p>
        ),
    },
    {
        id: "information",
        title: "Information we collect",
        content: (
            <p>
                [Describe the personal information collected from visitors,
                customers, business users, and people contacting support.]
            </p>
        ),
    },
    {
        id: "purposes",
        title: "How and why we use information",
        content: (
            <p>
                [Explain each processing purpose and the applicable legal
                basis, including accounts, promotions, redemptions, support,
                and communications.]
            </p>
        ),
    },
    {
        id: "sharing",
        title: "Who we share information with",
        content: (
            <p>
                [Explain service providers, information shared with businesses,
                and any other recipients.]
            </p>
        ),
    },
    {
        id: "retention",
        title: "How long we keep information",
        content: (
            <p>
                [Set out retention periods or the criteria used to determine
                them.]
            </p>
        ),
    },
    {
        id: "transfers",
        title: "International transfers",
        content: (
            <p>
                [Describe relevant international transfers and safeguards.]
            </p>
        ),
    },
    {
        id: "rights",
        title: "Your privacy rights",
        content: (
            <p>
                [Explain applicable rights, how to exercise them, and how to
                make a complaint.]
            </p>
        ),
    },
    {
        id: "changes",
        title: "Changes and contact details",
        content: (
            <p>
                [Explain how policy updates are communicated and provide the
                appropriate privacy contact.]
            </p>
        ),
    },
];

export default function PrivacyPage() {
    return (
        <LegalDocument
            title="Privacy policy"
            description="How we handle personal information when you visit or use Promotello."
            updatedAt="To be confirmed"
            version="Draft"
            draft
            sections={sections}
        />
    );
}