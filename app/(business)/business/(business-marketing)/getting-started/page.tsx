import type { Metadata } from "next";
import Link from "next/link";
import {
    FiArrowRight,
    FiCheck,
    FiAward,
    FiCheckCircle,
    FiGift,
    FiGrid,
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
    title: { absolute: "Getting Started | Promotello for Business" },
    description:
        "Get set up on Promotello: your business page, first offer, loyalty card and QR poster, and how your team scans at the till.",
};

const preparationItems = [
    "Your business name and a short description",
    "Your logo",
    "Your address and opening hours",
    "An idea for your first offer",
    "A loyalty reward, like a free coffee after nine",
    "Your Google review link, if you have one",
];

const steps = [
    {
        number: "01",
        icon: FiMapPin,
        title: "Set up your business",
        description:
            "Give customers what they need to find you and plan a visit. It takes about 15 minutes.",
        tasks: [
            "Create an account or sign in",
            "Add your business name, category and description",
            "Add your logo, address and opening hours",
            "Our team checks it before your page goes public",
        ],
        tip: "Write your description as if you're welcoming someone who has never visited before.",
        href: "/business/register",
        action: "Add your business",
    },
    {
        number: "02",
        icon: FiGift,
        title: "Create your first offer",
        description:
            "Give people a reason to try you. Customers claim it on their phone and get their own voucher.",
        tasks: [
            "Say exactly what the customer gets",
            "Add an image, an end date and any conditions",
            "Set a claim limit you can comfortably honour",
            "On Pro, it goes live as soon as your business is approved",
        ],
        tip: "Start with something you can easily fulfil. You can always try a different offer next.",
        href: "/business/dashboard",
        action: "Open your dashboard",
    },
    {
        number: "03",
        icon: FiAward,
        title: "Start a loyalty card",
        description:
            "Turn a first visit into a habit with a digital stamp card customers keep on their phone.",
        tasks: [
            "Choose how many stamps it takes (3 to 20)",
            "Choose the reward",
            "Add any terms, like one stamp per visit",
        ],
        tip: "Loyalty cards are part of Pro, which starts with a 30-day free trial.",
        href: "/business/dashboard",
        action: "Open your dashboard",
    },
    {
        number: "04",
        icon: FiGrid,
        title: "Print your QR poster",
        description:
            "Put a poster where customers will see it, so they can follow you, join your card or claim your offer.",
        tasks: [
            "Create a poster for each spot: window, till or tables",
            "Print it at A4 or A5",
            "Check its scan count after a few days",
        ],
        tip: "The front window and the till are usually the best places to start.",
        href: "/business/dashboard",
        action: "Make a poster",
    },
    {
        number: "05",
        icon: FiUsers,
        title: "Show your team how to scan",
        description:
            "Staff redeem vouchers and stamp cards with their own phone's camera. No card reader needed.",
        tasks: [
            "Invite staff from the Team page",
            "Show them how to scan a customer's QR code",
            "Tap \"Mark as used\" for a voucher or \"Add stamp\" for a loyalty card",
        ],
        tip: "Working on your own? You can do everything yourself, and inviting a team is optional.",
        href: "/business/dashboard",
        action: "Manage your team",
    },
    {
        number: "06",
        icon: FiCheckCircle,
        title: "Welcome your first customers",
        description:
            "Customers show their phone at the till, your team scans it, and that's it.",
        tasks: [
            "Scan the voucher or loyalty card",
            "Apply the offer or add the stamp",
            "If a voucher was already used or has ended, you'll see a warning",
            "Watch your results build up in Analytics",
        ],
        tip: "Add your Google review link in your business settings, so customers who've just visited are asked for a review.",
        href: "/business/dashboard",
        action: "View your dashboard",
    },
];

const promotionQuestions = [
    {
        title: "What does the customer receive?",
        description:
            "Describe the product, service, or experience clearly. Avoid making customers guess what is included.",
    },
    {
        title: "When can they use it?",
        description:
            "State any days, times, booking requirements, and the expiry date.",
    },
    {
        title: "What can your business accommodate?",
        description:
            "Think about stock, staffing, and capacity before choosing your total claim limit.",
    },
    {
        title: "Are there any conditions?",
        description:
            "Make exclusions, minimum spends, and other requirements easy to understand before someone claims.",
    },
];

export default function BusinessGettingStartedPage() {
    return (
        <main className="overflow-hidden bg-background text-foreground">
            <section className="relative isolate border-b">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 -z-10 size-96 rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
                    <div className="max-w-3xl">
                        <Badge variant="secondary">
                            Your business setup guide
                        </Badge>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
                            Let&apos;s get you set up.
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                            Six steps from signing up to welcoming your first
                            customers: your page, an offer, a loyalty card,
                            a QR poster and a team that knows how to scan.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                render={<Link href="/business/register" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Add your business
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={
                                    <Link href="/business/dashboard" />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Continue in your dashboard
                            </Button>
                        </div>

                        <p className="mt-5 text-sm text-muted-foreground">
                            You’ll need to sign in before adding or managing
                            a business.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
                <Card className="rounded-3xl bg-muted/30 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            A few things to have handy
                        </CardTitle>

                        <CardDescription className="text-base leading-7">
                            Gather these details to make setting up your
                            profile easier.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <ul className="grid gap-4 sm:grid-cols-2">
                            {preparationItems.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-3"
                                >
                                    <FiCheck
                                        aria-hidden="true"
                                        className="mt-1 size-4 shrink-0 text-primary"
                                    />

                                    <span className="text-sm leading-6">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </section>

            <section
                className="mx-auto max-w-5xl px-6 pb-20 sm:px-10"
                aria-label="Business setup steps"
            >
                <ol className="space-y-6">
                    {steps.map((step) => {
                        const Icon = step.icon;

                        return (
                            <li key={step.number}>
                                <Card className="rounded-3xl shadow-none">
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

                                                <p className="mt-4 leading-7 text-muted-foreground">
                                                    {step.description}
                                                </p>

                                                <ul className="mt-5 space-y-3">
                                                    {step.tasks.map(
                                                        (task) => (
                                                            <li
                                                                key={task}
                                                                className="flex items-start gap-3"
                                                            >
                                                                <FiCheck
                                                                    aria-hidden="true"
                                                                    className="mt-1 size-4 shrink-0 text-primary"
                                                                />

                                                                <span className="text-sm leading-6">
                                                                    {task}
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>

                                                <p className="mt-6 rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
                                                    {step.tip}
                                                </p>

                                                <Button
                                                    render={
                                                        <Link
                                                            href={step.href}
                                                        />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
                                                    className="mt-5"
                                                >
                                                    {step.action}
                                                    <FiArrowRight aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </li>
                        );
                    })}
                </ol>
            </section>

            <section className="border-y bg-[#17233B] text-white">
                <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
                    <div className="max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF8F7D]">
                            Before you publish
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            A clear offer makes everyone’s day easier.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-white/70">
                            Answer these four questions before creating your
                            offer.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-5 sm:grid-cols-2">
                        {promotionQuestions.map((question) => (
                            <div
                                key={question.title}
                                className="rounded-2xl border border-white/15 bg-white/5 p-6"
                            >
                                <h3 className="text-lg font-semibold">
                                    {question.title}
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-white/70">
                                    {question.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
                <div className="rounded-[2rem] bg-[#FFF4E8] px-6 py-14 text-center sm:px-12 sm:py-20">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-[#17233B] sm:text-5xl">
                            Ready to welcome your first regulars?
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-[#17233B]/70">
                            Start with your business profile. Your dashboard
                            checklist will help you keep track of the next steps.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Button
                                render={<Link href="/business/register" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Add your business
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={
                                    <Link href="/business/contact" />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Get help getting started
                            </Button>
                        </div>

                        <p className="mt-6 text-sm text-[#17233B]/65">
                            Still exploring?{" "}
                            <Link
                                href="/business/pricing"
                                className="font-medium underline underline-offset-4"
                            >
                                See pricing
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}