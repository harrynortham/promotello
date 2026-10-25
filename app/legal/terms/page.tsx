import type { Metadata } from "next";
import Link from "next/link";

import {
    LegalDocument,
    type LegalSection,
} from "@/components/legal-document";
import { TRIAL_DAYS } from "@/lib/billing";
import { company, companyLine } from "@/lib/legal";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "The terms that apply when you use Promotello, as a customer or a business.",
};

const summary = [
    "Promotello is free for customers. Offers and loyalty rewards are provided by the businesses that list them, not by us.",
    "Businesses can use the Free plan for as long as they like. Paid plans start with a free trial, renew automatically and can be cancelled any time.",
    "Use Promotello honestly: one account each, no fake claims or stamps, and only offers you can honour.",
    "Nothing in these terms affects your legal rights as a consumer.",
];

const sections: LegalSection[] = [
    {
        id: "about",
        title: "About these terms",
        content: (
            <>
                <p>
                    Promotello is run by {companyLine()} (&ldquo;we&rdquo;,
                    &ldquo;us&rdquo;). These terms apply to everyone who uses
                    Promotello. Sections marked <strong>for businesses</strong>{" "}
                    also apply if you list a business, together with the plan
                    details on our <Link href="/business/pricing">pricing page</Link>.
                </p>
                <p>
                    By creating an account or using Promotello you agree to these
                    terms. Our <Link href="/legal/privacy">privacy policy</Link>{" "}
                    explains how we handle personal information.
                </p>
            </>
        ),
    },
    {
        id: "accounts",
        title: "Your account",
        content: (
            <>
                <p>
                    You need to be at least 16 to create an account. Each account
                    is for one person: keep your sign-in details to yourself, and
                    tell us straight away if you think someone else has used
                    your account. You can sign in with an email and password or
                    with Google.
                </p>
                <p>
                    Keep your details accurate. You can close your account at
                    any time in{" "}
                    <Link href="/account/privacy">Account → Privacy &amp; data</Link>.
                </p>
            </>
        ),
    },
    {
        id: "offers",
        title: "Offers, vouchers and loyalty cards",
        content: (
            <>
                <p>
                    Offers and loyalty rewards are made by the businesses that
                    list them. The business is responsible for honouring them and
                    for the goods and services you buy; we provide the platform.
                    Each offer shows its own terms, such as when it&apos;s
                    available, how many can be claimed and when it ends, and
                    those apply too.
                </p>
                <p>
                    Claiming an offer gives you a voucher code. Show it, or let
                    staff scan it, when you pay. A voucher can be used once,
                    can&apos;t be exchanged for cash and may stop working if the
                    offer ends or is withdrawn. Loyalty stamps are added by the
                    business&apos;s staff when you visit; rewards are
                    whatever the business&apos;s card says.
                </p>
                <p>
                    If something goes wrong with an offer, speak to the business
                    first. If you can&apos;t sort it out,{" "}
                    <Link href="/contact">tell us</Link> and we&apos;ll help where
                    we can, including removing offers that aren&apos;t honoured.
                </p>
            </>
        ),
    },
    {
        id: "acceptable-use",
        title: "Using Promotello fairly",
        content: (
            <>
                <p>You mustn&apos;t:</p>
                <ul>
                    <li>create several accounts to claim an offer more than once, or claim on behalf of others;</li>
                    <li>add stamps to your own card, or to anyone else&apos;s, unless you&apos;re the business&apos;s staff serving a real visit;</li>
                    <li>copy, sell or share voucher codes;</li>
                    <li>post anything misleading, unlawful or offensive, or that you don&apos;t have the right to post;</li>
                    <li>try to break, overload or get around the security of Promotello, or collect other people&apos;s information from it.</li>
                </ul>
            </>
        ),
    },
    {
        id: "businesses",
        title: "Listing a business (for businesses)",
        content: (
            <>
                <p>
                    You must be allowed to act for the business you list. Its
                    details, photos, offers and loyalty cards must be accurate
                    and lawful, and you must honour every offer and reward you
                    publish while it&apos;s live, within its stated terms. You
                    control your offers and can pause or end them at any time;
                    customers who already hold a voucher should still be able
                    to use it until it expires.
                </p>
                <p>
                    We check new businesses and may review offers before they go
                    live. We can decline, pause or remove a business or offer
                    that breaks these terms, misleads customers or harms
                    Promotello&apos;s reputation, and we&apos;ll tell you why.
                </p>
                <p>
                    You&apos;re responsible for your team: anyone you invite can
                    act for the business with the role you give them. You can
                    see the customer information Promotello shows you only to
                    serve those customers, and must handle it in line with data
                    protection law.
                </p>
            </>
        ),
    },
    {
        id: "plans",
        title: "Plans, trials and payment (for businesses)",
        content: (
            <>
                <p>
                    The Free plan costs nothing. Paid plans (Pro and Growth) are
                    billed monthly or yearly in advance, at the prices on our{" "}
                    <Link href="/business/pricing">pricing page</Link>. Payments
                    are taken by Stripe. Founding-member prices stay the same
                    for as long as the subscription continues without a break.
                </p>
                <p>
                    Paid plans start with a {TRIAL_DAYS}-day free trial, one per
                    business. We take card details at the start but don&apos;t
                    charge until the trial ends. Cancel before then and you
                    won&apos;t pay anything.
                </p>
                <p>
                    Subscriptions renew automatically until cancelled. You can
                    cancel or change plan at any time from your Billing page. If
                    you cancel, you keep your plan until the end of the period
                    you&apos;ve paid for, then move to the Free plan: your newest
                    live offer stays up and the rest are paused, not deleted.
                    Payments already made aren&apos;t refunded, except where the
                    law requires.
                </p>
                <p>
                    We may change our prices. We&apos;ll give you at least 30
                    days&apos; notice by email, and a new price applies from your
                    next renewal after that, so you can cancel first if you
                    prefer.
                </p>
            </>
        ),
    },
    {
        id: "content",
        title: "Your content and ours",
        content: (
            <p>
                You keep ownership of what you upload, such as logos, photos and
                offer text. You give us permission to show it on Promotello and
                in emails, share images and listings that promote your business,
                for as long as it&apos;s on Promotello. The Promotello name,
                design and software belong to us.
            </p>
        ),
    },
    {
        id: "liability",
        title: "Our responsibility to you",
        content: (
            <>
                <p>
                    We work hard to keep Promotello running and accurate, but we
                    can&apos;t promise it will always be available or free of
                    errors, and we may change or improve features over time.
                </p>
                <p>
                    We aren&apos;t responsible for offers or rewards a business
                    doesn&apos;t honour, or for the goods and services businesses
                    provide. For businesses, we aren&apos;t liable for lost
                    profits, lost business or indirect losses, and our total
                    liability in any 12 months is limited to what you paid us in
                    that time.
                </p>
                <p>
                    Nothing in these terms limits liability for death or
                    personal injury caused by negligence, for fraud, or anything
                    else the law doesn&apos;t allow us to limit, and nothing
                    affects your statutory rights as a consumer.
                </p>
            </>
        ),
    },
    {
        id: "suspension",
        title: "Suspending or closing accounts",
        content: (
            <p>
                You can close your account at any time. We may suspend or close
                an account, or remove content, if it breaks these terms, if we
                need to for legal reasons, or to protect customers, businesses
                or Promotello. Unless the law or security stops us, we&apos;ll
                tell you why and give you a chance to put things right first.
                If we close a paid business account without good reason,
                we&apos;ll refund the unused part of your plan.
            </p>
        ),
    },
    {
        id: "changes",
        title: "Changes, contact and the law",
        content: (
            <>
                <p>
                    We may update these terms. We&apos;ll change the date at the
                    top, and tell you by email or in the app before a change
                    that affects you takes effect. If you keep using Promotello
                    after that, the new terms apply.
                </p>
                <p>
                    Questions or complaints: email{" "}
                    <a href={`mailto:${company.email}`}>{company.email}</a> or use our{" "}
                    <Link href="/contact">contact page</Link>. We&apos;ll try to
                    resolve any problem with you directly first.
                </p>
                <p>
                    These terms are governed by the law of England and Wales. If
                    you live elsewhere in the UK, you can also bring a claim in
                    the courts where you live.
                </p>
            </>
        ),
    },
];

export default function TermsPage() {
    return (
        <LegalDocument
            title="Terms of service"
            description="The terms that apply when you use Promotello, as a customer or a business."
            updatedAt="25 October 2026"
            version="1.0"
            summary={summary}
            sections={sections}
        />
    );
}
