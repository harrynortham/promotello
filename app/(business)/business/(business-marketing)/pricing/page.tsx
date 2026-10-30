import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import {
    FiArrowRight,
    FiCheck,
    FiMessageCircle,
    FiSliders,
    FiUsers,
} from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    FOUNDING_MEMBER_LIMIT,
    FREE_LIVE_OFFER_LIMIT,
    TRIAL_DAYS,
    countFoundingMembers,
    plans,
} from "@/lib/billing";

export const metadata: Metadata = {
    title: "Business Pricing",
    description: `Start free with ${FREE_LIVE_OFFER_LIMIT} live offer, go Pro for unlimited offers and loyalty cards at ${plans.pro_monthly.price}/month, or Growth for automated marketing at ${plans.growth_monthly.price}/month, each with a ${TRIAL_DAYS}-day free trial. Founding members pay ${plans.pro_founding_monthly.price}/month.`,
};

const freeFeatures = [
    "Business profile with location, opening hours and contact details",
    `${FREE_LIVE_OFFER_LIMIT} live offer at a time`,
    "Offer images, claim limits and expiry dates",
    "Customer redemption codes, with scan-to-redeem at the till",
    "1 printable QR poster with scan tracking",
    "Offer performance reporting",
    "Team access for your colleagues",
];

const growthFeatures = [
    "Everything in Pro",
    "Welcome, birthday and win-back emails that run themselves",
    "Quiet-hours offers that repeat on the days and times you choose",
    "A monthly value report in your inbox",
    "Instagram story images for your offers",
];

const proFeatures = [
    "Everything in Free",
    "Unlimited live offers",
    "Digital loyalty stamp cards, stamped by your staff",
    "A QR poster for every spot, with scans compared",
    "Google review prompts after a visit",
    "Followers emailed whenever you post a new offer",
    "Paused offers come back as soon as you upgrade",
];

const principles = [
    {
        icon: FiSliders,
        title: "Control the commitment",
        description:
            "Set your own offer terms and claim limits. Choose offers that make sense for your margins and capacity.",
    },
    {
        icon: FiUsers,
        title: "Bring your whole team",
        description:
            "Give colleagues access without having to choose who deserves a paid seat.",
    },
    {
        icon: FiMessageCircle,
        title: "Try it before you pay",
        description: `Every Pro plan starts with a ${TRIAL_DAYS}-day free trial. Cancel before it ends and you won't be charged.`,
    },
];

const questions = [
    {
        question: "How does the free trial work?",
        answer: `Pro and Growth start with a ${TRIAL_DAYS}-day free trial. We ask for a card when you start, but don't charge it until the trial ends. Cancel any time before then from your billing page and you won't pay anything. Each business can have one free trial.`,
    },
    {
        question: "What is the founding member price?",
        answer: `The first ${FOUNDING_MEMBER_LIMIT} businesses to join Pro pay ${plans.pro_founding_monthly.price} a month instead of ${plans.pro_monthly.price}, for as long as they stay subscribed. It includes everything in Pro, now and as Pro grows.`,
    },
    {
        question: "What counts as a live offer?",
        answer:
            "An offer is live while it is waiting for approval or approved, and hasn't reached its expiry date. Expired offers don't count, so on the Free plan you can publish a new one as soon as your current one ends.",
    },
    {
        question: "What happens if I cancel?",
        answer:
            "You keep your plan until the end of the period you've paid for, then move to the Free plan. Your newest live offer stays up and the rest are paused and hidden from customers. Nothing is deleted, and paused offers come back if you subscribe again.",
    },
    {
        question: "What counts as a business?",
        answer:
            "A business is a separate business profile managed in Promotello. You can access multiple profiles from one account. Contact us if you manage several brands or locations so we can discuss the right setup.",
    },
    {
        question: "Do I pay for every offer or customer claim?",
        answer:
            "No. There are no per-offer or per-claim fees on any plan. The cost of fulfilling your offer remains your responsibility.",
    },
    {
        question: "Does a subscription guarantee customers?",
        answer:
            "No. Results depend on your offer, location and customers. Promotello gives you the tools and shows you what they bring in, so you can judge whether it's worth it.",
    },
    {
        question: "Can I limit an offer?",
        answer:
            "Yes. You can set an optional total claim limit, an expiry date, and clear terms explaining when and how customers can use the offer.",
    },
    {
        question: "Will my offers appear immediately?",
        answer:
            "Our team checks every new business first. Once yours is approved, offers on Pro and Growth go live as soon as you create them. On the Free plan, each offer is reviewed before it appears.",
    },
    {
        question: "What's the difference between Pro and Growth?",
        answer:
            "Pro has everything to bring customers back: unlimited offers, a loyalty card, QR posters, follower emails and review prompts. Growth adds marketing that runs itself: welcome, birthday and win-back emails with reward vouchers, quiet-hours offers and a monthly value report. You can switch between them any time.",
    },
    {
        question: "Is VAT included?",
        answer:
            "Promotello isn't currently VAT registered, so no VAT is added to these prices. All prices are in GBP.",
    },
];

// Refreshed at most hourly so the page stays fast and static.
async function getFoundingPlacesLeft() {
    "use cache";
    cacheLife("hours");

    try {
        return Math.max(FOUNDING_MEMBER_LIMIT - (await countFoundingMembers()), 0);
    } catch {
        return null;
    }
}

async function FoundingPlacesLeft() {
    const placesLeft = await getFoundingPlacesLeft();

    if (placesLeft === null) {
        return <>Limited to the first {FOUNDING_MEMBER_LIMIT} businesses.</>;
    }

    if (placesLeft === 0) {
        return <>All founding places have been taken.</>;
    }

    return (
        <>
            Only <strong>{placesLeft}</strong> of {FOUNDING_MEMBER_LIMIT}{" "}
            founding places left.
        </>
    );
}

function FeatureList({ features }: { features: string[] }) {
    return (
        <ul className="mt-5 space-y-4">
            {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                    <FiCheck
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-primary"
                    />

                    <span>{feature}</span>
                </li>
            ))}
        </ul>
    );
}

export default function BusinessPricingPage() {
    return (
        <main className="overflow-hidden bg-background text-foreground">
            <section className="relative isolate">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 max-w-3xl rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto max-w-7xl px-6 pb-14 pt-16 sm:px-10 sm:pt-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <Badge variant="secondary">
                            Simple pricing, no per-claim fees
                        </Badge>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
                            Start free.
                            <br />
                            Upgrade when you&apos;re ready.
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                            Put your business on the map with a free profile
                            and your first offer. Go Pro to run as many
                            offers as you like.
                        </p>
                    </div>

                    <div className="mx-auto mt-12 max-w-5xl rounded-3xl border border-primary/30 bg-[#FFF4E8] p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                                Founding member offer
                            </p>

                            <p className="mt-2 text-xl font-semibold text-[#17233B]">
                                Pro for {plans.pro_founding_monthly.price} a
                                month, locked in for as long as you stay
                                subscribed.
                            </p>

                            <p className="mt-2 text-sm text-[#17233B]/70">
                                <Suspense
                                    fallback={
                                        <>
                                            Limited to the first{" "}
                                            {FOUNDING_MEMBER_LIMIT} businesses.
                                        </>
                                    }
                                >
                                    <FoundingPlacesLeft />
                                </Suspense>
                            </p>
                        </div>

                        <Button
                            render={<Link href="/business/register" />}
                            nativeButton={false}
                            size="lg"
                            className="mt-5 shrink-0 sm:mt-0"
                        >
                            Claim a founding place
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    </div>

                    <div className="mx-auto mt-6 grid max-w-6xl gap-6 lg:grid-cols-3">
                        <Card className="rounded-3xl shadow-none">
                            <CardHeader className="p-7 sm:p-9">
                                <CardTitle className="text-2xl">Free</CardTitle>

                                <CardDescription className="mt-2 text-base leading-7">
                                    Everything you need to get your first
                                    offer in front of local customers.
                                </CardDescription>

                                <div className="pt-7">
                                    <div className="flex items-end gap-2">
                                        <span className="text-6xl font-semibold tracking-tight">
                                            £0
                                        </span>

                                        <span className="pb-2 text-muted-foreground">
                                            / forever
                                        </span>
                                    </div>

                                    <p className="mt-3 text-sm text-muted-foreground">
                                        No card needed
                                    </p>
                                </div>
                            </CardHeader>

                            <CardContent className="px-7 pb-7 sm:px-9 sm:pb-9">
                                <Button
                                    render={<Link href="/business/register" />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="lg"
                                    className="w-full"
                                >
                                    Get started free
                                </Button>

                                <Separator className="my-7" />

                                <p className="text-sm font-semibold">
                                    Included
                                </p>

                                <FeatureList features={freeFeatures} />
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden rounded-3xl border-primary/30 shadow-lg">
                            <CardHeader className="p-7 sm:p-9">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <CardTitle className="text-2xl">Pro</CardTitle>

                                    <Badge variant="secondary">
                                        {TRIAL_DAYS}-day free trial
                                    </Badge>
                                </div>

                                <CardDescription className="mt-2 text-base leading-7">
                                    For businesses ready to keep customers
                                    coming back with more than one offer.
                                </CardDescription>

                                <div className="pt-7">
                                    <div className="flex items-end gap-2">
                                        <span className="text-6xl font-semibold tracking-tight">
                                            {plans.pro_monthly.price}
                                        </span>

                                        <span className="pb-2 text-muted-foreground">
                                            / month
                                        </span>
                                    </div>

                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Or {plans.pro_yearly.price} a year
                                        ({plans.pro_yearly.note?.toLowerCase()})
                                        · Cancel any time
                                    </p>
                                </div>
                            </CardHeader>

                            <CardContent className="px-7 pb-7 sm:px-9 sm:pb-9">
                                <Button
                                    render={<Link href="/business/register" />}
                                    nativeButton={false}
                                    size="lg"
                                    className="w-full"
                                >
                                    Start your free trial
                                    <FiArrowRight aria-hidden="true" />
                                </Button>

                                <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                                    Card required. You won&apos;t be charged
                                    until your trial ends.
                                </p>

                                <Separator className="my-7" />

                                <p className="text-sm font-semibold">
                                    Included
                                </p>

                                <FeatureList features={proFeatures} />
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl shadow-none">
                            <CardHeader className="p-7 sm:p-9">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <CardTitle className="text-2xl">Growth</CardTitle>

                                    <Badge variant="secondary">
                                        {TRIAL_DAYS}-day free trial
                                    </Badge>
                                </div>

                                <CardDescription className="mt-2 text-base leading-7">
                                    Marketing that runs without you: automatic
                                    emails, quiet-hours offers and monthly reports.
                                </CardDescription>

                                <div className="pt-7">
                                    <div className="flex items-end gap-2">
                                        <span className="text-6xl font-semibold tracking-tight">
                                            {plans.growth_monthly.price}
                                        </span>

                                        <span className="pb-2 text-muted-foreground">
                                            / month
                                        </span>
                                    </div>

                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Or {plans.growth_yearly.price} a year
                                        ({plans.growth_yearly.note?.toLowerCase()})
                                        · Cancel any time
                                    </p>
                                </div>
                            </CardHeader>

                            <CardContent className="px-7 pb-7 sm:px-9 sm:pb-9">
                                <Button
                                    render={<Link href="/business/register" />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="lg"
                                    className="w-full"
                                >
                                    Start your free trial
                                </Button>

                                <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                                    Card required. You won&apos;t be charged
                                    until your trial ends.
                                </p>

                                <Separator className="my-7" />

                                <p className="text-sm font-semibold">
                                    Included
                                </p>

                                <FeatureList features={growthFeatures} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mx-auto mt-6 max-w-5xl rounded-3xl border p-7 sm:flex sm:items-center sm:justify-between sm:gap-8">
                        <div>
                            <h2 className="text-xl font-semibold">
                                More than one business?
                            </h2>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                Each business profile has its own plan, and
                                you manage them all from one account. If you
                                run several businesses or locations, talk to
                                us about the right setup.
                            </p>
                        </div>

                        <Button
                            render={
                                <Link href="/business/contact?subject=Multiple%20businesses" />
                            }
                            nativeButton={false}
                            variant="outline"
                            className="mt-5 shrink-0 sm:mt-0"
                        >
                            Discuss your businesses
                        </Button>
                    </div>

                    <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-6 text-muted-foreground">
                        Prices are per business, in GBP. Promotello isn&apos;t
                        currently VAT registered, so no VAT is added.
                    </p>
                </div>
            </section>

            <section className="border-y bg-muted/30">
                <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-10 md:grid-cols-3">
                    {principles.map((principle) => {
                        const Icon = principle.icon;

                        return (
                            <div key={principle.title}>
                                <Icon
                                    aria-hidden="true"
                                    className="size-6 text-primary"
                                />

                                <h2 className="mt-4 text-xl font-semibold">
                                    {principle.title}
                                </h2>

                                <p className="mt-3 leading-7 text-muted-foreground">
                                    {principle.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
                <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                            Your questions, answered
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Know what you’re signing up for.
                        </h2>

                        <p className="mt-5 leading-7 text-muted-foreground">
                            Clear expectations make for better partnerships.
                            Here are the details to consider before joining.
                        </p>

                        <Button
                            render={<Link href="/business/contact" />}
                            nativeButton={false}
                            variant="outline"
                            className="mt-6"
                        >
                            Ask us a question
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {questions.map((question) => (
                            <Card
                                key={question.question}
                                className="rounded-2xl shadow-none"
                            >
                                <CardHeader>
                                    <CardTitle className="text-lg leading-7">
                                        {question.question}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <p className="leading-7 text-muted-foreground">
                                        {question.answer}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
                <div className="rounded-[2rem] bg-[#FFF4E8] px-6 py-14 text-center sm:px-12 sm:py-20">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-[#17233B] sm:text-5xl">
                            Let’s find your next reason to welcome someone in.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-[#17233B]/70">
                            Set up your business profile and your first
                            offer in a few minutes. It&apos;s free to start.
                        </p>

                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <Button
                                render={<Link href="/business/register" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Get started free
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={
                                    <Link href="/business/contact?subject=Business%20plan%20enquiry" />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Talk to Promotello
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}