import type { Metadata } from "next";
import Link from "next/link";
import {
    FiArrowRight,
    FiCheck,
    FiCheckCircle,
    FiGift,
    FiMapPin,
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
    title: { absolute: "How It Works | Promotello for Business" },
    description:
        "See how to add your business, create a promotion, and welcome customers with Promotello. A simple guide from setup to redemption.",
};

const steps = [
    {
        number: "01",
        icon: FiMapPin,
        title: "Tell customers about your business.",
        description:
            "Create your account and add your business profile. Include the details people need to plan a visit.",
        details: [
            "Your business name, logo, and description",
            "Your location and opening hours",
            "Your website and contact details",
        ],
        note: "Your business is reviewed before its promotions can appear publicly.",
    },
    {
        number: "02",
        icon: FiGift,
        title: "Create an offer worth discovering.",
        description:
            "Choose something you would like customers to try. Add a photo, explain the offer, and set the terms.",
        details: [
            "Explain what the customer receives",
            "Choose an expiry date and availability",
            "Set an optional limit on total claims",
        ],
        note: "Submit your promotion for approval. It can appear publicly once both the business and promotion are approved.",
    },
    {
        number: "03",
        icon: FiUsers,
        title: "Customers discover and claim it.",
        description:
            "Customers browse Promotello, find your promotion, and claim a redemption code.",
        details: [
            "They can read your offer and its terms",
            "They can explore your business profile",
            "They receive a code to show your team",
        ],
        note: "A claim means someone has chosen your offer. It does not mean they have visited or used it yet.",
    },
    {
        number: "04",
        icon: FiCheckCircle,
        title: "Welcome them in and check their code.",
        description:
            "When the customer visits, they show their code. Your team checks the redemption and marks it as used when the deal is fulfilled.",
        details: [
            "Find the customer’s redemption code",
            "Check the offer and redemption status",
            "Mark it as used when you provide the deal",
        ],
        note: "Your dashboard helps you follow claims and used redemptions.",
    },
];

const questions = [
    {
        question: "Do I need to offer a big discount?",
        answer:
            "Choose an offer that works for your business. A bundle, an introductory experience, or an extra with a purchase may be a better fit than a large discount.",
    },
    {
        question: "Can I control how many customers claim it?",
        answer:
            "Yes. Set an optional total claim limit when creating your promotion. Further claims stop once that limit is reached.",
    },
    {
        question: "Can my staff help?",
        answer:
            "Yes. Invite team members so they can help check customer codes and mark redemptions as used.",
    },
    {
        question: "What if a customer claims but never visits?",
        answer:
            "The claim stays unused. Only mark a redemption as used when your business has fulfilled the promotion.",
    },
];

export default function BusinessHowItWorksPage() {
    return (
        <main className="overflow-hidden bg-background text-foreground">
            <section className="relative isolate border-b">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 max-w-3xl rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <Badge variant="secondary">
                            How Promotello works
                        </Badge>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
                            Create an offer.
                            <br />
                            Give someone a reason to visit.
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                            Add your business, publish a promotion, and welcome
                            customers who discover you on Promotello. Here’s
                            how it works.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Button
                                render={<Link href="/business/register" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Get started
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={<Link href="/business/pricing" />}
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

            <section
                className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20"
                aria-label="Steps to using Promotello"
            >
                <ol className="space-y-6">
                    {steps.map((step) => {
                        const Icon = step.icon;

                        return (
                            <li key={step.number}>
                                <Card className="overflow-hidden rounded-3xl shadow-none">
                                    <CardContent className="p-6 sm:p-9">
                                        <div className="grid gap-6 sm:grid-cols-[4rem_1fr] sm:gap-8">
                                            <div className="flex items-center gap-4 sm:block">
                                                <span className="flex size-14 items-center justify-center rounded-2xl bg-[#FF593F]/10 text-lg font-semibold text-[#FF593F]">
                                                    {step.number}
                                                </span>

                                                <Icon
                                                    aria-hidden="true"
                                                    className="size-6 text-muted-foreground sm:mx-auto sm:mt-5"
                                                />
                                            </div>

                                            <div>
                                                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                                    {step.title}
                                                </h2>

                                                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                                                    {step.description}
                                                </p>

                                                <ul className="mt-5 space-y-3">
                                                    {step.details.map(
                                                        (detail) => (
                                                            <li
                                                                key={detail}
                                                                className="flex items-start gap-3"
                                                            >
                                                                <FiCheck
                                                                    aria-hidden="true"
                                                                    className="mt-1 size-4 shrink-0 text-[#FF593F]"
                                                                />

                                                                <span className="text-sm leading-6">
                                                                    {detail}
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>

                                                <p className="mt-6 rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
                                                    {step.note}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </li>
                        );
                    })}
                </ol>
            </section>

            <section className="bg-[#17233B] text-white">
                <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20">
                    <div className="max-w-2xl">
                        <Badge
                            variant="outline"
                            className="border-white/25 text-white"
                        >
                            A simple example
                        </Badge>

                        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Imagine you run a local café.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-white/70">
                            You want to encourage a few more weekday visits.
                            You create a coffee-and-cake promotion with clear
                            terms and a limit of 30 claims.
                        </p>
                    </div>

                    <div className="mt-9 grid gap-4 md:grid-cols-3">
                        {[
                            {
                                title: "You publish",
                                description:
                                    "Your approved promotion appears on Promotello.",
                            },
                            {
                                title: "A customer claims",
                                description:
                                    "They receive a code and plan their visit.",
                            },
                            {
                                title: "Your team welcomes",
                                description:
                                    "They check the code and mark it as used when serving the deal.",
                            },
                        ].map((item) => (
                            <div
                                key={item.title}
                                className="rounded-2xl border border-white/15 bg-white/5 p-6"
                            >
                                <h3 className="text-lg font-semibold">
                                    {item.title}
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-white/70">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <p className="mt-6 text-sm text-white/60">
                        Illustrative example. Your offer, terms, and claim
                        limit are yours to choose.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
                <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Before you start
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            A few things you might be wondering.
                        </h2>

                        <p className="mt-5 leading-7 text-muted-foreground">
                            Have a question about how this would work for
                            your business? Talk it through with us.
                        </p>

                        <Button
                            render={<Link href="/business/contact" />}
                            nativeButton={false}
                            variant="outline"
                            className="mt-6"
                        >
                            Ask a question
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {questions.map((item) => (
                            <Card
                                key={item.question}
                                className="rounded-2xl shadow-none"
                            >
                                <CardHeader>
                                    <CardTitle className="text-lg leading-7">
                                        {item.question}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <CardDescription className="text-base leading-7">
                                        {item.answer}
                                    </CardDescription>
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
                            What could your first offer be?
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-[#17233B]/70">
                            Start with something your customers will enjoy
                            and your business can deliver confidently.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Button
                                render={<Link href="/business/register" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Create your business profile
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={<Link href="/business/pricing" />}
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Explore pricing
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}