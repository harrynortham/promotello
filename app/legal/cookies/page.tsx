import type { Metadata } from "next";

import {
    LegalDocument,
    type LegalSection,
} from "@/components/legal-document";

export const metadata: Metadata = {
    title: "Cookie Policy",
    description: "Information about cookies and similar technologies.",
    robots: { index: false, follow: true },
};

const sections: LegalSection[] = [
    {
        id: "about-cookies",
        title: "About cookies",
        content: (
            <p>
                [Explain cookies and any similar storage technologies used
                by the platform.]
            </p>
        ),
    },
    {
        id: "technologies",
        title: "Technologies we use",
        content: (
            <p>
                [List the technologies actually present on the site following
                an audit, including authentication, analytics, and embedded
                third-party services.]
            </p>
        ),
    },
    {
        id: "purposes",
        title: "Why they are used",
        content: (
            <p>
                [Explain the purpose of each category and distinguish
                necessary technologies from optional ones.]
            </p>
        ),
    },
    {
        id: "duration",
        title: "Providers and duration",
        content: (
            <p>
                [Identify relevant providers, storage names, purposes, and
                durations.]
            </p>
        ),
    },
    {
        id: "choices",
        title: "Managing your choices",
        content: (
            <p>
                [Explain the consent controls actually implemented on your
                site and how visitors can change their choices.]
            </p>
        ),
    },
    {
        id: "third-parties",
        title: "Third-party content",
        content: (
            <p>
                [Explain relevant third-party content, such as embedded maps,
                and any associated storage or data collection.]
            </p>
        ),
    },
    {
        id: "contact",
        title: "Updates and questions",
        content: (
            <p>
                [Provide the policy update process and appropriate contact
                details.]
            </p>
        ),
    },
];

export default function CookiesPage() {
    return (
        <LegalDocument
            title="Cookie policy"
            description="Information about cookies, similar technologies, and your choices when using Promotello."
            updatedAt="To be confirmed"
            version="Draft"
            draft
            sections={sections}
        />
    );
}