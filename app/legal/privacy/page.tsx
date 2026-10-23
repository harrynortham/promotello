import type { Metadata } from "next";
import Link from "next/link";

import {
    LegalDocument,
    type LegalSection,
} from "@/components/legal-document";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Information about how Promotello handles personal data.",
    robots: { index: false, follow: true },
};

// Details still to be confirmed before launch are marked [in brackets].

const summary = [
    "We collect what we need to run your account, your vouchers and loyalty cards, and the tools businesses use.",
    "Marketing emails are optional. Every one has an unsubscribe link, and you can turn them off in your account.",
    "Businesses see your first name on vouchers and loyalty cards you use with them. They never see who follows them or your email address.",
    "We don't sell your information or use advertising trackers.",
];

const sections: LegalSection[] = [
    {
        id: "who-we-are",
        title: "Who we are",
        content: (
            <>
                <p>
                    Promotello is operated by [legal entity name], [registered
                    address] (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the
                    controller of the personal information described in this
                    policy. [ICO registration number.]
                </p>
                <p>
                    For anything about your personal information, contact us at
                    [privacy email address] or through our{" "}
                    <Link href="/contact">contact page</Link>.
                </p>
            </>
        ),
    },
    {
        id: "information",
        title: "Information we collect",
        content: (
            <>
                <p>
                    <strong>Your account.</strong> Your email address, password
                    (stored only as a secure hash), name and, if you add it,
                    your town or city.
                </p>
                <p>
                    <strong>Vouchers.</strong> The offers you claim, your
                    voucher codes, when you claimed them and when a business
                    marked them as used.
                </p>
                <p>
                    <strong>Loyalty cards.</strong> The cards you join, each
                    stamp and reward, and when they happened.
                </p>
                <p>
                    <strong>Businesses you follow.</strong> Which businesses you
                    follow, when you started, and whether you want their emails.
                    We also record which new-offer emails we&apos;ve sent you,
                    so you never get the same one twice.
                </p>
                <p>
                    <strong>Review links.</strong> When you click through to
                    leave a business a Google review, we record the click so we
                    don&apos;t ask you again. What you write on Google is
                    covered by Google&apos;s privacy policy, not this one.
                </p>
                <p>
                    <strong>Your email preferences</strong>, including any
                    unsubscribe requests.
                </p>
                <p>
                    <strong>Business accounts.</strong> If you run a business on
                    Promotello: the business&apos;s details, locations, opening
                    hours, offers and team members, and your role in the team.
                    Card payments are taken by Stripe; we receive your
                    subscription status and billing contact details but never
                    your full card number.
                </p>
                <p>
                    <strong>Messages to us</strong> through the contact form,
                    including your name, email address and what you tell us.
                </p>
                <p>
                    <strong>Usage counts.</strong> We count views of business
                    and offer pages and scans of QR posters so businesses can
                    see how they&apos;re doing. These counts aren&apos;t linked
                    to you: for QR scans we keep only the type of device
                    (mobile, tablet or desktop), not your IP address.
                </p>
            </>
        ),
    },
    {
        id: "purposes",
        title: "How and why we use information",
        content: (
            <>
                <p>UK data protection law requires a legal basis for each use:</p>
                <ul>
                    <li>
                        <strong>To provide Promotello (contract):</strong> your
                        account, claiming and using vouchers, loyalty cards,
                        following businesses, business dashboards, team
                        invitations and subscriptions.
                    </li>
                    <li>
                        <strong>Service emails (contract):</strong> voucher
                        confirmations, sign-in and password emails, team
                        invitations and important account notices. You
                        can&apos;t turn these off while you have an account.
                    </li>
                    <li>
                        <strong>New-offer emails (consent):</strong> when you
                        follow a business, you ask us to email you when it
                        posts a new offer. Other optional emails, such as deals,
                        product news and feedback requests, are off unless you
                        turn them on. You can withdraw consent at any time; see
                        below.
                    </li>
                    <li>
                        <strong>Review prompts and business statistics
                        (legitimate interests):</strong> asking for a review
                        after a recent visit, and showing businesses totals such
                        as views, claims, stamps and follower numbers, which
                        helps them decide whether Promotello works for them.
                    </li>
                    <li>
                        <strong>Keeping Promotello safe (legitimate
                        interests):</strong> approving businesses and offers,
                        preventing fraud such as self-stamping, and keeping
                        audit logs of admin actions.
                    </li>
                    <li>
                        <strong>Legal obligations:</strong> keeping billing and
                        tax records.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: "marketing",
        title: "Marketing emails and unsubscribing",
        content: (
            <>
                <p>Every marketing email has an unsubscribe link. You can also:</p>
                <ul>
                    <li>
                        use your email app&apos;s own unsubscribe button, which
                        works in one click;
                    </li>
                    <li>
                        turn off emails from one business, or from all
                        businesses, in{" "}
                        <Link href="/account/notifications">
                            your notification settings
                        </Link>
                        ;
                    </li>
                    <li>unfollow a business.</li>
                </ul>
                <p>
                    Unsubscribing takes effect straight away and doesn&apos;t
                    affect service emails.
                </p>
            </>
        ),
    },
    {
        id: "sharing",
        title: "Who we share information with",
        content: (
            <>
                <p>
                    <strong>Businesses you use.</strong> When you use a voucher
                    or loyalty card, that business&apos;s staff see your first
                    name, the voucher or card, and its history, so they can
                    serve you.
                    Businesses see statistics about their followers, such as how
                    many there are, but not who they are or their email
                    addresses. Businesses don&apos;t receive customers&apos;
                    email addresses from us.
                </p>
                <p>
                    <strong>Your business team.</strong> If you&apos;re a member
                    of a business&apos;s team, its owners and admins can see
                    your email address and role.
                </p>
                <p>
                    <strong>Service providers</strong> who process information
                    for us under contract:
                </p>
                <ul>
                    <li>Supabase: database, sign-in and file storage</li>
                    <li>Vercel: website hosting</li>
                    <li>Resend: sending emails</li>
                    <li>Stripe: subscription payments for businesses</li>
                    <li>
                        Google: only if you choose to click through to leave a
                        review
                    </li>
                </ul>
                <p>
                    We may also share information if the law requires it, or to
                    a buyer if Promotello is sold, in which case this policy
                    continues to apply. We never sell personal information.
                </p>
            </>
        ),
    },
    {
        id: "retention",
        title: "How long we keep information",
        content: (
            <ul>
                <li>
                    Account, voucher, loyalty and follow information: while your
                    account is open. When you delete your account, we delete it
                    or make it anonymous within [30] days.
                </li>
                <li>
                    Records of sent emails and review clicks: deleted with your
                    account.
                </li>
                <li>
                    Billing and tax records: [6] years, as UK law requires.
                </li>
                <li>Contact-form messages: [2] years.</li>
                <li>
                    Page view and QR scan counts aren&apos;t personal
                    information, so we may keep them.
                </li>
            </ul>
        ),
    },
    {
        id: "transfers",
        title: "International transfers",
        content: (
            <p>
                Some of our providers are based in, or use staff in, the United
                States. Where your information leaves the UK, we rely on UK
                adequacy regulations (including the UK Extension to the EU-US
                Data Privacy Framework) or the UK International Data Transfer
                Addendum to protect it. [Confirm the region our Supabase project
                is hosted in.]
            </p>
        ),
    },
    {
        id: "rights",
        title: "Your privacy rights",
        content: (
            <>
                <p>Under UK data protection law you can ask us to:</p>
                <ul>
                    <li>give you a copy of your personal information;</li>
                    <li>correct information that is wrong;</li>
                    <li>delete your information;</li>
                    <li>restrict or object to how we use it;</li>
                    <li>
                        send information you gave us to you or another service.
                    </li>
                </ul>
                <p>
                    Make a request through our{" "}
                    <Link href="/contact">contact page</Link> using your account
                    email. We&apos;ll reply within one month, and may ask you to
                    confirm your identity first.
                </p>
                <p>
                    If you&apos;re unhappy with how we&apos;ve handled your
                    information, please tell us first. You can also complain to
                    the Information Commissioner&apos;s Office at ico.org.uk or
                    on 0303 123 1113.
                </p>
            </>
        ),
    },
    {
        id: "cookies",
        title: "Cookies",
        content: (
            <p>
                We use cookies that are needed to keep you signed in. We
                don&apos;t use advertising or third-party tracking cookies. See
                our <Link href="/legal/cookies">cookie policy</Link>.
            </p>
        ),
    },
    {
        id: "changes",
        title: "Changes to this policy",
        content: (
            <p>
                We&apos;ll update the date at the top of this page when the
                policy changes. If a change affects how we use your
                information, we&apos;ll tell you by email or in the app before
                it takes effect.
            </p>
        ),
    },
];

export default function PrivacyPage() {
    return (
        <LegalDocument
            title="Privacy policy"
            description="How we handle personal information when you visit or use Promotello."
            updatedAt="23 October 2026"
            version="Draft for review"
            draft
            summary={summary}
            sections={sections}
        />
    );
}
