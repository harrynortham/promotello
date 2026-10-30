import type { Metadata } from "next";
import Link from "next/link";
import {
    FiArrowRight,
    FiCheck,
    FiCompass,
    FiGift,
    FiHeart,
    FiMapPin,
} from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
    title: { absolute: "About Promotello | Find Your Next Local Favourite" },
    description:
        "Discover what Promotello is about: local discoveries, clear offers, and more reasons to enjoy the businesses around you.",
};

const discoveries = [
    {
        icon: FiGift,
        title: "A little more to look forward to.",
        description:
            "Find an offer that turns an ordinary lunch, catch-up, or afternoon out into something worth making plans for.",
    },
    {
        icon: FiCompass,
        title: "Somewhere you haven’t tried yet.",
        description:
            "Look beyond your usual places. Your next favourite café, shop, or experience could be closer than you think.",
    },
    {
        icon: FiHeart,
        title: "More connection to your local area.",
        description:
            "Get to know the businesses around you and the things that make each one worth a visit.",
    },
];

const steps = [
    {
        number: "01",
        title: "Find something you like",
        description:
            "Browse offers, explore categories, or get to know a local business.",
    },
    {
        number: "02",
        title: "Check the details and claim",
        description:
            "Read what’s included, when you can use it, and any conditions. Claim an available offer to get your code.",
    },
    {
        number: "03",
        title: "Visit and enjoy",
        description:
            "Follow the offer’s instructions and show your code to the business when you use the deal.",
    },
];

export default function AboutPage() {
    return (
        <main className="overflow-hidden bg-background text-foreground">
            <section className="relative isolate">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 -z-10 size-96 rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-2">
                    <div>
                        <Badge variant="secondary">
                            A little more local
                        </Badge>

                        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                            Good things happen when you{" "}
                            <span className="text-[#FF593F]">
                                try somewhere new.
                            </span>
                        </h1>

                        <p className="mt-6 text-lg leading-8 text-muted-foreground">
                            A coffee that becomes your usual. A place you
                            can’t wait to tell a friend about. An afternoon
                            that turns out better than planned.
                        </p>

                        <p className="mt-4 text-lg leading-8 text-muted-foreground">
                            Promotello helps you discover local businesses
                            and offers that give you a reason to visit.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                render={<Link href="/explore" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Find your next favourite
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={<Link href="/businesses" />}
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Meet local businesses
                            </Button>
                        </div>
                    </div>

                    {/* Replace this illustration with a local lifestyle photo later. */}
                    <div className="relative rounded-[2rem] bg-[#FFF4E8] p-6 sm:p-10">
                        <div className="relative overflow-hidden rounded-3xl bg-[#17233B] px-7 py-14 text-center text-white sm:py-20">
                            <div
                                aria-hidden="true"
                                className="absolute -right-12 -top-12 size-48 rounded-full bg-[#FF593F]/25"
                            />

                            <div
                                aria-hidden="true"
                                className="absolute -bottom-20 -left-16 size-64 rounded-full border-[24px] border-white/10"
                            />

                            <div className="relative">
                                <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white/10">
                                    <FiMapPin
                                        aria-hidden="true"
                                        className="size-8 text-[#FF8F7D]"
                                    />
                                </span>

                                <p className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                                    A new favourite.
                                    <br />
                                    A familiar feeling.
                                </p>

                                <p className="mx-auto mt-5 max-w-xs leading-7 text-white/70">
                                    Discover the places that make your
                                    neighbourhood yours.
                                </p>
                            </div>
                        </div>

                        <div className="relative mx-3 -mt-5 rounded-2xl border bg-background p-5 shadow-sm">
                            <p className="text-sm font-semibold">
                                Your next “we should go there”
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Start with a little curiosity.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y bg-muted/30">
                <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-10 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Why we’re here
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            There’s more around you than you think.
                        </h2>
                    </div>

                    <div className="space-y-5 text-lg leading-8 text-muted-foreground">
                        <p>
                            It’s easy to return to the same places. Finding
                            somewhere different takes a little inspiration,
                            especially when you want to make your money go
                            further.
                        </p>

                        <p>
                            We’re building Promotello to make those
                            discoveries easier. A place to explore offers,
                            learn about local businesses, and turn an
                            interesting find into a plan.
                        </p>

                        <p>
                            We want the experience to feel straightforward:
                            see the offer, understand the details, and decide
                            whether it’s right for you.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
                <div className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        More reasons to explore
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Make room for a good discovery.
                    </h2>
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    {discoveries.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Card
                                key={item.title}
                                className="rounded-3xl shadow-none"
                            >
                                <CardHeader>
                                    <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FF593F]/10 text-[#FF593F]">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-6"
                                        />
                                    </span>

                                    <CardTitle className="pt-4 text-2xl leading-tight">
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <p className="leading-7 text-muted-foreground">
                                        {item.description}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            <section className="bg-[#17233B] text-white">
                <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
                    <div className="max-w-2xl">
                        <Badge
                            variant="outline"
                            className="border-white/25 text-white"
                        >
                            From browsing to being there
                        </Badge>

                        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Find it. Claim it. Make a plan.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-white/70">
                            A few simple steps between discovering an offer
                            and enjoying it.
                        </p>
                    </div>

                    <ol className="mt-10 grid gap-6 md:grid-cols-3">
                        {steps.map((step) => (
                            <li
                                key={step.number}
                                className="rounded-3xl border border-white/15 bg-white/5 p-6 sm:p-8"
                            >
                                <span className="text-sm font-semibold text-[#FF8F7D]">
                                    {step.number}
                                </span>

                                <h3 className="mt-4 text-xl font-semibold">
                                    {step.title}
                                </h3>

                                <p className="mt-3 leading-7 text-white/70">
                                    {step.description}
                                </p>
                            </li>
                        ))}
                    </ol>

                    <p className="mt-6 text-sm leading-6 text-white/60">
                        Some offers require a booking or apply only at
                        certain times. Always check the offer details
                        before visiting.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        Clear details matter
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Know what you’re choosing.
                    </h2>

                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        An offer should be easy to understand. We ask
                        businesses to explain what’s included and the
                        conditions that apply.
                    </p>

                    <p className="mt-5 leading-7 text-muted-foreground">
                        Business and offer approval forms part of our
                        publishing process. The participating business
                        provides the deal, so its published terms help you
                        know what to expect.
                    </p>
                </div>

                <Card className="rounded-3xl bg-muted/30 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            Before you claim, check:
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <ul className="space-y-5">
                            {[
                                "What the offer includes",
                                "Where and when you can use it",
                                "Whether you need to book ahead",
                                "The expiry date and any exclusions",
                            ].map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-3"
                                >
                                    <FiCheck
                                        aria-hidden="true"
                                        className="mt-1 size-5 shrink-0 text-[#FF593F]"
                                    />

                                    <span className="leading-7">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
                <div className="rounded-[2rem] bg-[#FFF4E8] px-6 py-14 text-center sm:px-12 sm:py-20">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-[#17233B] sm:text-5xl">
                            Where will curiosity take you?
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-[#17233B]/70">
                            Browse a category you love or try something
                            unexpected. Your next local favourite is waiting
                            to be discovered.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Button
                                render={<Link href="/explore" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Start exploring
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={<Link href="/categories" />}
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Browse categories
                            </Button>
                        </div>

                        <p className="mt-7 text-sm text-[#17233B]/65">
                            Run a local business?{" "}
                            <Link
                                href="/business"
                                className="font-medium underline underline-offset-4"
                            >
                                Discover Promotello for business
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}