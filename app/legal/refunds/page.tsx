import type { Metadata } from "next";
import Link from "next/link";

import {
    LegalDocument,
    type LegalSection,
} from "@/components/legal-document";
import { TRIAL_DAYS } from "@/lib/billing";
import { company, companyLine } from "@/lib/legal";

export const metadata: Metadata = {
    title: "Refund and Cancellation Policy",
    description: "How cancelling and refunds work for businesses on Promotello's paid plans.",
};

// Must agree with the "Plans, trials and payment" section of the terms.
const summary = [
    "Only businesses pay Promotello. Customers never pay us: browsing, claiming offers and loyalty cards are free.",
    `Paid plans start with a ${TRIAL_DAYS}-day free trial. Cancel before it ends and you pay nothing.`,
    "Cancel any time from your Billing page. You keep your plan until the end of the period you've paid for, and you won't be charged again.",
    "Payments already made aren't refunded, except where we've charged you in error or the law requires it.",
];

const supportLink = <a href={`mailto:${company.supportEmail}`}>{company.supportEmail}</a>;

const sections: LegalSection[] = [
    {
        id: "who-pays",
        title: "Who pays Promotello",
        content: (
            <>
                <p>
                    Promotello is run by {companyLine()}. It&apos;s free for
                    customers: browsing offers, claiming vouchers and collecting
                    loyalty stamps never cost anything, and customers never pay
                    us. When a customer uses an offer, they pay the business
                    directly for whatever they buy, not through Promotello.
                </p>
                <p>
                    The only payments we take are subscriptions from businesses
                    for our paid plans (Pro and Growth), at the prices on our{" "}
                    <Link href="/business/pricing">pricing page</Link>.
                    Businesses can also stay on the Free plan for as long as
                    they like. Payments are taken securely by Stripe.
                </p>
            </>
        ),
    },
    {
        id: "trial",
        title: "Free trial",
        content: (
            <p>
                Each paid plan starts with a {TRIAL_DAYS}-day free trial, one
                per business. We take card details at the start but don&apos;t
                charge anything until the trial ends. If you cancel before the
                trial ends, you won&apos;t be charged at all. We email you before
                the trial ends to remind you.
            </p>
        ),
    },
    {
        id: "cancelling",
        title: "Cancelling",
        content: (
            <>
                <p>
                    Subscriptions renew automatically, monthly or yearly, until
                    you cancel. You can cancel at any time, without a reason or
                    a fee: go to Billing in your business dashboard and choose
                    Manage billing. You can also email {supportLink} and
                    we&apos;ll cancel it for you.
                </p>
                <p>
                    When you cancel, you keep your plan until the end of the
                    period you&apos;ve already paid for, and you won&apos;t be
                    charged again. After that, your business moves to the Free
                    plan: your profile stays, your newest live offer stays up,
                    and your other offers are paused, not deleted. Subscribe
                    again whenever you like and they come back.
                </p>
            </>
        ),
    },
    {
        id: "refunds",
        title: "Refunds",
        content: (
            <>
                <p>
                    Because you can cancel at any time and keep your plan until
                    the end of the period, payments already made, monthly or
                    yearly, aren&apos;t refunded for the rest of that period.
                </p>
                <p>We will refund you:</p>
                <ul>
                    <li>
                        in full, if we charged you in error, for example a
                        duplicate payment or a charge after you had cancelled
                    </li>
                    <li>
                        for the unused part of your plan, if we close your
                        account without good reason (see our{" "}
                        <Link href="/legal/terms#suspension">terms</Link>)
                    </li>
                    <li>wherever else the law requires it</li>
                </ul>
                <p>
                    To ask for a refund, email {supportLink} from the address on
                    your account, with your business name and the date of the
                    payment. Refunds go back to the card you paid with and
                    usually take 5 to 10 working days to appear.
                </p>
            </>
        ),
    },
    {
        id: "price-changes",
        title: "Price changes",
        content: (
            <p>
                If we change our prices, we&apos;ll email you at least 30
                days before. The new price applies from your next renewal after
                that, so you can cancel first if you prefer. Founding-member
                prices stay the same for as long as the subscription continues
                without a break.
            </p>
        ),
    },
    {
        id: "contact",
        title: "Questions about a payment",
        content: (
            <p>
                If something on a payment doesn&apos;t look right, please email{" "}
                {supportLink} before raising it with your bank, so we can sort
                it out quickly. This policy forms part of our{" "}
                <Link href="/legal/terms">terms of service</Link>.
            </p>
        ),
    },
];

export default function RefundsPage() {
    return (
        <LegalDocument
            title="Refund and cancellation policy"
            description="How cancelling and refunds work for businesses on Promotello's paid plans."
            updatedAt="29 October 2026"
            version="1.0"
            summary={summary}
            sections={sections}
        />
    );
}
