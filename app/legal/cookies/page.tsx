import type { Metadata } from "next";
import Link from "next/link";

import {
    LegalDocument,
    type LegalSection,
} from "@/components/legal-document";

export const metadata: Metadata = {
    title: "Cookie Policy",
    description: "Information about cookies and similar technologies.",
    robots: { index: false, follow: true },
};

// Keep this in step with what the site actually sets. Audited 23 October
// 2026: Supabase auth cookies only; the Google map loads on request.

const summary = [
    "Promotello only uses cookies that are needed to keep you signed in.",
    "We don't use advertising, analytics or tracking cookies, so there's nothing to accept or reject.",
    "Google Maps can set its own cookies, so a business's map only loads when you choose to show it.",
];

const cookies = [
    {
        name: "sb-…-auth-token",
        purpose:
            "Keeps you signed in. Very long sessions may be split across numbered cookies (.0, .1).",
        duration: "Up to 400 days, or until you sign out",
    },
    {
        name: "sb-…-auth-token-code-verifier",
        purpose:
            "Completes sign-up confirmation and password reset links securely.",
        duration: "Removed once the link is used",
    },
];

const sections: LegalSection[] = [
    {
        id: "about",
        title: "About cookies",
        content: (
            <p>
                Cookies are small files a website stores in your browser. Some
                are essential to make a site work, such as remembering that
                you&apos;re signed in. Others track you for analytics or
                advertising. UK law allows essential cookies without asking,
                and requires your consent for everything else.
            </p>
        ),
    },
    {
        id: "technologies",
        title: "Cookies we use",
        content: (
            <>
                <p>
                    We only set essential cookies, and only when you sign in or
                    use a sign-up or password link. If you browse without
                    signing in, we set none.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[32rem] text-left text-sm">
                        <thead className="text-foreground">
                            <tr className="border-b">
                                <th className="py-2 pr-4 font-semibold">Cookie</th>
                                <th className="py-2 pr-4 font-semibold">What it&apos;s for</th>
                                <th className="py-2 font-semibold">How long</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cookies.map((cookie) => (
                                <tr key={cookie.name} className="border-b align-top">
                                    <td className="py-3 pr-4 font-mono text-xs text-foreground">
                                        {cookie.name}
                                    </td>
                                    <td className="py-3 pr-4 leading-6">{cookie.purpose}</td>
                                    <td className="py-3 leading-6">{cookie.duration}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>
                    These are set by Supabase, which runs our sign-in, on
                    Promotello&apos;s own domain. We don&apos;t use cookies for
                    analytics or advertising. The page view and QR scan counts
                    businesses see are recorded without cookies and aren&apos;t
                    linked to you.
                </p>
            </>
        ),
    },
    {
        id: "third-parties",
        title: "Other companies' cookies",
        content: (
            <ul>
                <li>
                    <strong>Google Maps.</strong> Business pages can show a map.
                    It only loads when you press &ldquo;Show map&rdquo;, and
                    Google may then set its own cookies. See Google&apos;s
                    privacy policy at policies.google.com.
                </li>
                <li>
                    <strong>Stripe.</strong> When a business pays for a
                    subscription, it goes to Stripe&apos;s own checkout pages,
                    which use Stripe&apos;s cookies to process payments and
                    prevent fraud. See stripe.com/privacy.
                </li>
                <li>
                    <strong>Google reviews.</strong> If you click through to
                    leave a review, you&apos;re on Google&apos;s website and its
                    cookie policy applies.
                </li>
            </ul>
        ),
    },
    {
        id: "choices",
        title: "Managing your choices",
        content: (
            <>
                <p>
                    Because we only use essential cookies, there&apos;s no
                    cookie banner to accept or reject. You can still block or
                    delete cookies in your browser settings, but you won&apos;t
                    be able to stay signed in to Promotello without them.
                </p>
                <p>
                    Signing out removes our sign-in cookie. If we ever add
                    optional cookies, we&apos;ll ask for your consent first and
                    update this page.
                </p>
            </>
        ),
    },
    {
        id: "contact",
        title: "Questions",
        content: (
            <p>
                See our <Link href="/legal/privacy">privacy policy</Link> for
                how we handle personal information, or get in touch through
                our <Link href="/contact">contact page</Link>.
            </p>
        ),
    },
];

export default function CookiesPage() {
    return (
        <LegalDocument
            title="Cookie policy"
            description="Information about cookies, similar technologies, and your choices when using Promotello."
            updatedAt="23 October 2026"
            version="Draft for review"
            draft
            summary={summary}
            sections={sections}
        />
    );
}
