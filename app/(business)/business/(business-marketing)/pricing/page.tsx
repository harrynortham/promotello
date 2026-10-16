import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
    title: "Business Pricing | Promotello",
    description:
        "Explore proposed Promotello launch pricing: £19 per business per month for promotion tools, redemption management, and business reporting.",
};

const includedFeatures = [
    "One business profile",
    "Unlimited promotions",
    "Promotion images and clear offer terms",
    "Optional claim limits and expiry dates",
    "Customer redemption codes",
    "Redemption management",
    "Promotion performance reporting",
    "Unlimited team members",
    "Business notification preferences",
    "Location, opening hours, and contact details",
];

const principles = [
    {
        icon: FiSliders,
        title: "Control the commitment",
        description:
            "Set your own promotion terms and claim limits. Choose offers that make sense for your margins and capacity.",
    },
    {
        icon: FiUsers,
        title: "Bring your whole team",
        description:
            "Give colleagues access without having to choose who deserves a paid seat.",
    },
    {
        icon: FiMessageCircle,
        title: "Ask before you commit",
        description:
            "Talk through your business, your promotion ideas, and any questions before subscribing.",
    },
];

const questions = [
    {
        question: "Is this pricing available now?",
        answer:
            "This is our proposed launch pricing. Contact us to discuss joining. We will confirm availability, final pricing, and subscription terms before you make a payment.",
    },
    {
        question: "What counts as a business?",
        answer:
            "A business is a separate business profile managed in Promotello. You can access multiple profiles from one account. Contact us if you manage several brands or locations so we can discuss the right setup.",
    },
    {
        question: "Do I pay for every promotion or customer claim?",
        answer:
            "The proposed plan includes unlimited promotions with no additional Promotello fee per claim. The cost of fulfilling your promotion remains your responsibility.",
    },
    {
        question: "Does a subscription guarantee customers?",
        answer:
            "No. Results depend on your offer, location, customer demand, and availability. Promotello provides tools to publish promotions and track claims and usage so you can assess the response.",
    },
    {
        question: "Can I limit a promotion?",
        answer:
            "Yes. You can set an optional total claim limit, an expiry date, and clear terms explaining when and how customers can use the offer.",
    },
    {
        question: "Will my promotions appear immediately?",
        answer:
            "Your business and promotions need approval before promotions appear publicly. Subscribing does not bypass that review.",
    },
    {
        question: "Is VAT included?",
        answer:
            "Any applicable VAT and the final total will be confirmed before you subscribe.",
    },
];

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
                            Proposed launch pricing
                        </Badge>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
                            One clear price.
                            <br />
                            More reasons to be discovered.
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                            Give your promotions a home, keep your team
                            organised, and understand customer activity—with
                            a straightforward monthly plan.
                        </p>
                    </div>

                    <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <Card className="overflow-hidden rounded-3xl border-primary/30 shadow-lg">
                            <CardHeader className="p-7 sm:p-9">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <CardTitle className="text-2xl">
                                        Promotello Business
                                    </CardTitle>

                                    <Badge variant="secondary">
                                        One simple plan
                                    </Badge>
                                </div>

                                <CardDescription className="mt-2 text-base leading-7">
                                    For local businesses ready to turn a good
                                    offer into a new introduction.
                                </CardDescription>

                                <div className="pt-7">
                                    <div className="flex items-end gap-2">
                                        <span className="text-6xl font-semibold tracking-tight">
                                            £19
                                        </span>

                                        <span className="pb-2 text-muted-foreground">
                                            / month
                                        </span>
                                    </div>

                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Per business · GBP · Proposed launch
                                        price
                                    </p>
                                </div>
                            </CardHeader>

                            <CardContent className="px-7 pb-7 sm:px-9 sm:pb-9">
                                <Button
                                    render={
                                        <Link href="/business/contact?subject=Business%20plan%20enquiry" />
                                    }
                                    nativeButton={false}
                                    size="lg"
                                    className="w-full"
                                >
                                    Enquire about joining
                                    <FiArrowRight aria-hidden="true" />
                                </Button>

                                <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                                    An enquiry does not start a subscription
                                    or take a payment.
                                </p>

                                <Separator className="my-7" />

                                <p className="text-sm font-semibold">
                                    Included in the proposed plan
                                </p>

                                <ul className="mt-5 space-y-4">
                                    {includedFeatures.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-start gap-3 text-sm"
                                        >
                                            <FiCheck
                                                aria-hidden="true"
                                                className="mt-0.5 size-4 shrink-0 text-primary"
                                            />

                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-6">
                            <Card className="rounded-3xl bg-muted/30 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-xl">
                                        Start with an offer that works for you.
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <p className="leading-7 text-muted-foreground">
                                        A weekday special. An introductory
                                        treatment. A bundle worth sharing.
                                        Choose a promotion you can deliver
                                        confidently, then follow the response.
                                    </p>

                                    <Button
                                        render={
                                            <Link href="/business/how-it-works" />
                                        }
                                        nativeButton={false}
                                        variant="outline"
                                        className="mt-6"
                                    >
                                        See how it works
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="flex-1 rounded-3xl shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-xl">
                                        More than one business?
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <p className="leading-7 text-muted-foreground">
                                        Manage your business profiles from
                                        one account. If you operate several
                                        businesses or locations, talk to us
                                        about the right setup.
                                    </p>

                                    <Button
                                        render={
                                            <Link href="/business/contact?subject=Multiple%20businesses" />
                                        }
                                        nativeButton={false}
                                        variant="outline"
                                        className="mt-6"
                                    >
                                        Discuss your businesses
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-6 text-muted-foreground">
                        Final pricing, applicable VAT, billing arrangements,
                        and cancellation terms will be confirmed before you
                        subscribe.
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
                            Tell us about your business and the kind of
                            promotion you have in mind.
                        </p>

                        <Button
                            render={
                                <Link href="/business/contact?subject=Business%20plan%20enquiry" />
                            }
                            nativeButton={false}
                            size="lg"
                            className="mt-8"
                        >
                            Talk to Promotello
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}