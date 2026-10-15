import type { Metadata } from "next";
import Link from "next/link";
import {
    FiArrowRight,
    FiBarChart2,
    FiCheck,
    FiCheckCircle,
    FiClock,
    FiGift,
    FiMapPin,
    FiShield,
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

export const metadata: Metadata = {
    title: "Promotello for Business | Give Customers a Reason to Visit",
    description:
        "Create local promotions, control how many customers can claim them, and track when deals are used. Discover Promotello for your business.",
};

const benefits = [
    {
        icon: FiMapPin,
        title: "Be someone’s next discovery.",
        description:
            "Give people browsing local deals a reason to choose your café, shop, salon, or experience.",
    },
    {
        icon: FiSliders,
        title: "Make the offer work for you.",
        description:
            "Choose your promotion, set its terms, and limit claims to a number your business can comfortably handle.",
    },
    {
        icon: FiBarChart2,
        title: "See what happens next.",
        description:
            "Follow promotion claims and used codes to understand how customers respond to your offers.",
    },
];

const steps = [
    {
        number: "01",
        title: "Introduce your business",
        description:
            "Add your profile, location, and opening hours so customers know who you are and where to find you.",
    },
    {
        number: "02",
        title: "Create a reason to visit",
        description:
            "Build a promotion with clear terms, an expiry date, and an optional claim limit. Submit it for approval.",
    },
    {
        number: "03",
        title: "Welcome customers in",
        description:
            "Customers claim a code, visit your business, and show it to your team. Mark it as used when they enjoy the deal.",
    },
];

const ideas = [
    {
        icon: FiClock,
        category: "Fill a quieter moment",
        title: "Make Tuesday their new favourite.",
        description:
            "Give customers an extra reason to visit during the times you would like to be busier.",
        example: "Example: a weekday lunch offer",
    },
    {
        icon: FiGift,
        category: "Introduce something new",
        title: "Turn curiosity into a first visit.",
        description:
            "Put a new menu item, treatment, product, or experience in front of people looking for something different.",
        example: "Example: an introductory treatment",
    },
    {
        icon: FiUsers,
        category: "Bring people together",
        title: "Give them a reason to bring a friend.",
        description:
            "Create a promotion that makes your business part of their next catch-up, outing, or shared experience.",
        example: "Example: a deal for two",
    },
];

const controls = [
    "Set an optional limit on total claims",
    "Choose when your promotion expires",
    "Explain exactly what is included",
    "Give staff access to manage redemptions",
];

const faqs = [
    {
        question: "What kind of promotion should I create?",
        answer:
            "Start with something that makes sense for your margins and your customers. That might be a weekday offer, a bundle, an introductory experience, or an added extra with a purchase.",
    },
    {
        question: "Can I limit how many people claim an offer?",
        answer:
            "Yes. You can set a total claim limit for a promotion. Once that limit is reached, further claims are stopped.",
    },
    {
        question: "How does my team check a customer’s deal?",
        answer:
            "The customer shows their redemption code at your business. Your team can find the code and mark it as used when the promotion is fulfilled.",
    },
    {
        question: "Will my promotion appear immediately?",
        answer:
            "Your business and promotion need approval before the promotion appears publicly. This helps keep information clear and useful for customers.",
    },
];

export default function BusinessPage() {
    return (
        <main className="overflow-hidden bg-background text-foreground">
            {/* Hero */}
            <section className="relative isolate">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-2 lg:gap-16">
                    <div>
                        <Badge variant="secondary">
                            Meet your next local customer
                        </Badge>

                        <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                            Give them a reason to{" "}
                            <span className="text-[#FF593F]">
                                walk through your door.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                            You bring the great business. Promotello helps you
                            share an offer worth discovering—with tools to
                            control your promotions and track how they’re used.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                render={
                                    <Link href="/business/register" />
                                }
                                nativeButton={false}
                                size="lg"
                            >
                                Get started
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={
                                    <Link href="/business/pricing" />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Explore pricing
                            </Button>
                        </div>

                        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
                            {[
                                "Your offer",
                                "Your claim limits",
                                "Your terms",
                            ].map((item) => (
                                <span
                                    key={item}
                                    className="inline-flex items-center gap-2"
                                >
                                    <FiCheck
                                        aria-hidden="true"
                                        className="text-[#FF593F]"
                                    />
                                    {item}
                                </span>
                            ))}
                        </div>

                        <p className="mt-7 text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link
                                href="/business/dashboard"
                                className="font-medium text-foreground underline underline-offset-4"
                            >
                                Open your dashboard
                            </Link>
                        </p>
                    </div>

                    {/* Replace this visual area with a generated hero asset later. */}
                    <div className="relative pb-8 sm:px-4">
                        <div className="relative overflow-hidden rounded-[2rem] border border-[#17233B]/10 bg-[#FFF4E8] p-6 sm:p-8">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17233B]/60">
                                    Your next visit starts here
                                </span>

                                <FiMapPin
                                    aria-hidden="true"
                                    className="size-5 text-[#FF593F]"
                                />
                            </div>

                            <div className="relative mt-6 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-[#17233B] p-8">
                                <div
                                    aria-hidden="true"
                                    className="absolute -right-12 -top-12 size-52 rounded-full bg-[#FF593F]/30"
                                />

                                <div
                                    aria-hidden="true"
                                    className="absolute -bottom-16 -left-12 size-64 rounded-full border-[24px] border-white/10"
                                />

                                <div className="relative max-w-xs text-center text-white">
                                    <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white/10">
                                        <FiGift
                                            aria-hidden="true"
                                            className="size-8 text-[#FF8F7D]"
                                        />
                                    </span>

                                    <p className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                                        A new favourite.
                                        <br />
                                        Just around the corner.
                                    </p>

                                    <p className="mt-4 text-sm leading-6 text-white/65">
                                        Local businesses. Good discoveries.
                                        More reasons to visit.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#FF593F]">
                                    <FiMapPin aria-hidden="true" />
                                </span>

                                <div>
                                    <p className="text-sm font-semibold text-[#17233B]">
                                        Make your business part of their plans
                                    </p>

                                    <p className="mt-1 text-xs text-[#17233B]/60">
                                        From first discovery to a visit in person
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative mx-4 -mt-5 flex items-center gap-3 rounded-2xl border bg-background p-4 shadow-lg sm:mx-8">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <FiCheckCircle
                                    aria-hidden="true"
                                    className="size-5"
                                />
                            </span>

                            <div>
                                <p className="text-sm font-semibold">
                                    Built around a real visit
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Discover. Claim. Visit. Enjoy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="border-y bg-muted/30">
                <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-10 md:grid-cols-3">
                    {benefits.map((benefit) => {
                        const Icon = benefit.icon;

                        return (
                            <div key={benefit.title}>
                                <Icon
                                    aria-hidden="true"
                                    className="size-6 text-[#FF593F]"
                                />

                                <h2 className="mt-4 text-xl font-semibold tracking-tight">
                                    {benefit.title}
                                </h2>

                                <p className="mt-3 leading-7 text-muted-foreground">
                                    {benefit.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Promotion ideas */}
            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
                <div className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        Start with an opportunity
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        What would a few more visits mean for your business?
                    </h2>

                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        A promotion can do more than reduce a price. Use it to
                        introduce your business, showcase something special,
                        or give customers a reason to visit at a different time.
                    </p>
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    {ideas.map((idea) => {
                        const Icon = idea.icon;

                        return (
                            <Card
                                key={idea.title}
                                className="flex flex-col rounded-3xl shadow-none"
                            >
                                <CardHeader>
                                    <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FF593F]/10 text-[#FF593F]">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-6"
                                        />
                                    </span>

                                    <p className="pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {idea.category}
                                    </p>

                                    <CardTitle className="text-2xl leading-tight">
                                        {idea.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="flex flex-1 flex-col">
                                    <p className="leading-7 text-muted-foreground">
                                        {idea.description}
                                    </p>

                                    <p className="mt-auto pt-6 text-sm font-medium">
                                        {idea.example}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* Business control */}
            <section className="bg-[#17233B] text-white">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-2">
                    <div>
                        <Badge
                            variant="outline"
                            className="border-white/25 text-white"
                        >
                            You stay in control
                        </Badge>

                        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                            A good promotion should work for your business,
                            too.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-white/70">
                            Decide what you can offer, how long it lasts, and
                            how many customers can claim it. Clear boundaries
                            help you welcome new customers with confidence.
                        </p>

                        <ul className="mt-7 space-y-4">
                            {controls.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-3"
                                >
                                    <FiCheckCircle
                                        aria-hidden="true"
                                        className="mt-1 size-5 shrink-0 text-[#FF8F7D]"
                                    />

                                    <span className="text-white/85">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <Button
                            render={
                                <Link href="/business/features" />
                            }
                            nativeButton={false}
                            variant="secondary"
                            size="lg"
                            className="mt-8"
                        >
                            Explore the features
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    </div>

                    <div className="rounded-3xl border border-white/15 bg-white/5 p-6 sm:p-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                                    A promotion on your terms
                                </p>

                                <h3 className="mt-3 text-2xl font-semibold">
                                    Set the details.
                                    <br />
                                    Make it yours.
                                </h3>
                            </div>

                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                                <FiSliders
                                    aria-hidden="true"
                                    className="size-6 text-[#FF8F7D]"
                                />
                            </span>
                        </div>

                        <div className="mt-8 space-y-3">
                            {[
                                {
                                    label: "The offer",
                                    value: "Something customers will love",
                                },
                                {
                                    label: "Claim limit",
                                    value: "A number that works for you",
                                },
                                {
                                    label: "Expiry",
                                    value: "A clear end date",
                                },
                                {
                                    label: "Terms",
                                    value: "Clear expectations for everyone",
                                },
                            ].map((row) => (
                                <div
                                    key={row.label}
                                    className="rounded-2xl bg-white/5 p-4"
                                >
                                    <p className="text-xs text-white/50">
                                        {row.label}
                                    </p>

                                    <p className="mt-1 text-sm font-medium">
                                        {row.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        From profile to promotion
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Your next chapter starts with one offer.
                    </h2>

                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        Start with a business profile and a promotion you feel
                        good about. Build from there as you learn what customers
                        respond to.
                    </p>
                </div>

                <div className="mt-12 grid gap-10 md:grid-cols-3">
                    {steps.map((step) => (
                        <div key={step.number}>
                            <span className="flex size-12 items-center justify-center rounded-full bg-[#FF593F]/10 text-sm font-semibold text-[#FF593F]">
                                {step.number}
                            </span>

                            <h3 className="mt-5 text-xl font-semibold">
                                {step.title}
                            </h3>

                            <p className="mt-3 leading-7 text-muted-foreground">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-10 text-center">
                    <Button
                        render={
                            <Link href="/business/how-it-works" />
                        }
                        nativeButton={false}
                        variant="outline"
                    >
                        Take a closer look
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>
            </section>

            {/* Trust */}
            <section className="border-y bg-[#FFF8F0]">
                <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-10 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <FiShield
                            aria-hidden="true"
                            className="size-8 text-[#FF593F]"
                        />

                        <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                            Know what you’re getting.
                        </h2>
                    </div>

                    <div>
                        <p className="text-lg leading-8 text-muted-foreground">
                            A promotion’s results depend on your offer,
                            location, availability, and customer demand.
                            Promotello gives you tools to publish it clearly
                            and track claims and usage, so you can judge what
                            works for your business.
                        </p>

                        <p className="mt-5 leading-7 text-muted-foreground">
                            Explore the features and pricing before you decide.
                            If you have questions, talk to us.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button
                                render={
                                    <Link href="/business/pricing" />
                                }
                                nativeButton={false}
                                variant="outline"
                            >
                                View pricing
                            </Button>

                            <Button
                                render={
                                    <Link href="/business/contact" />
                                }
                                nativeButton={false}
                                variant="ghost"
                            >
                                Ask a question
                                <FiArrowRight aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
                <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Before you get started
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            A few useful answers.
                        </h2>

                        <p className="mt-5 leading-7 text-muted-foreground">
                            Want to talk through your business or promotion
                            idea? We’d like to hear from you.
                        </p>

                        <Button
                            render={
                                <Link href="/business/contact" />
                            }
                            nativeButton={false}
                            variant="outline"
                            className="mt-6"
                        >
                            Contact us
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {faqs.map((faq) => (
                            <Card
                                key={faq.question}
                                className="rounded-2xl shadow-none"
                            >
                                <CardHeader>
                                    <CardTitle className="text-lg leading-7">
                                        {faq.question}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <CardDescription className="text-base leading-7">
                                        {faq.answer}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-[#FFF4E8] px-6 py-14 text-center sm:px-12 sm:py-20">
                    <div
                        aria-hidden="true"
                        className="absolute -right-16 -top-16 size-64 rounded-full bg-[#FF593F]/10"
                    />

                    <div className="relative mx-auto max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Give your business a new introduction
                        </p>

                        <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[#17233B] sm:text-5xl">
                            Someone’s next favourite could be you.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-[#17233B]/70">
                            Help them find you. Create your business profile
                            and start planning your first promotion.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Button
                                render={
                                    <Link href="/business/register" />
                                }
                                nativeButton={false}
                                size="lg"
                            >
                                Get started with Promotello
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={
                                    <Link href="/business/pricing" />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                View pricing
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}