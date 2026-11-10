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

// Keep this in step with what the site actually sets. Audited 11 November
// 2026: the Supabase sign-in cookies and the city choice, and nothing
// else. Google Analytics is gone, and with it the only cookie anyone was
// ever asked about; the Google map still loads only on request.

const summary = [
    "We use essential cookies only: to keep you signed in, and to remember the city you pick.",
    "We don't use analytics or advertising cookies, so there's no cookie banner to answer.",
    "Google Maps can set its own cookies, so a business's map only loads when you choose to show it.",
];

const essentialCookies = [
    {
        name: "sb-…-auth-token",
        purpose:
            "Keeps you signed in. Very long sessions may be split across numbered cookies (.0, .1).",
        duration: "Up to 400 days, or until you sign out",
    },
    {
        name: "sb-…-auth-token-code-verifier",
        purpose:
            "Completes a sign-in or sign-up link securely.",
        duration: "Removed once the link is used",
    },
    {
        name: "promotello_city",
        purpose: "Remembers the city you chose in the location search, so you see its offers. Only set when you choose one.",
        duration: "1 year",
    },
];

function CookieTable({ rows }: { rows: typeof essentialCookies }) {
    return (
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
                    {rows.map((cookie) => (
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
    );
}

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
                <h3 className="font-semibold text-foreground">Essential cookies</h3>
                <p>
                    These are needed for the site to work, so they don&apos;t
                    need your consent. The sign-in cookies are set by Supabase,
                    which runs our sign-in, on Promotello&apos;s own domain, and
                    only when you sign in or use a sign-up link.
                </p>
                <CookieTable rows={essentialCookies} />

                <h3 className="pt-2 font-semibold text-foreground">Analytics cookies</h3>
                <p>
                    None. We used Google Analytics behind a cookie banner
                    until November 2026 and have removed it. If we measure
                    how the site is used again, we&apos;ll use something that
                    doesn&apos;t set cookies or follow you between sites.
                </p>

                <p>
                    The page view and QR scan counts businesses see are
                    separate: they&apos;re recorded without cookies and
                    aren&apos;t linked to you.
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
                    There is nothing to ask you about and no banner to
                    answer: every cookie we set is needed to run the site,
                    and UK law allows those without consent. If that ever
                    changes we&apos;ll ask first, and nothing optional will be
                    set until you say yes.
                </p>
                <p>
                    If you answered the banner we used to show, that answer
                    and the Google Analytics cookies it allowed are deleted
                    the next time you open the site.
                </p>
                <p>
                    You can block or delete cookies in your browser settings,
                    but you won&apos;t be able to stay signed in to Promotello
                    without the essential ones. Signing out removes our
                    sign-in cookie.
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
            updatedAt="11 November 2026"
            version="1.1"
            summary={summary}
            sections={sections}
        />
    );
}
