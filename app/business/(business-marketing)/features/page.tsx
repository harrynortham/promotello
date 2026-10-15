import type { Metadata } from "next";
import Link from "next/link";
import {
    FiArrowRight,
    FiBarChart2,
    FiBell,
    FiCheck,
    FiCheckCircle,
    FiClock,
    FiGift,
    FiMapPin,
    FiSettings,
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
    title: "Business Features | Promotello",
    description:
        "Create promotions, set claim limits, manage redemption codes, and track customer activity with Promotello’s business tools.",
};

const highlights = [
    {
        icon: FiGift,
        title: "Create your offer",
        description:
            "Bring your promotion to life with an image, clear details, and terms customers can understand.",
    },
    {
        icon: FiSliders,
        title: "Choose your limits",
        description:
            "Set an expiry date and an optional total claim limit that suits your business.",
    },
    {
        icon: FiCheckCircle,
        title: "Manage each visit",
        description:
            "Check customer codes and mark promotions as used when your team fulfils them.",
    },
    {
        icon: FiBarChart2,
        title: "Follow the response",
        description:
            "See promotion claims and used redemptions to understand customer activity.",
    },
];

const promotionDetails = [
    "Promotion title, description, and image",
    "Availability and expiry date",
    "Clear redemption terms",
    "Optional total claim limit",
];

const profileDetails = [
    "Business logo and description",
    "Location, map, and directions",
    "Opening hours",
    "Website and contact details",
    "Your available promotions",
];

const supportingFeatures = [
    {
        icon: FiUsers,
        title: "Bring your team",
        description:
            "Invite colleagues and assign roles so staff can help with customer redemptions while management stays with the right people.",
        detail: "Useful for busy teams and shared responsibilities.",
    },
    {
        icon: FiBell,
        title: "Choose your updates",
        description:
            "Configure daily summaries, low-inventory updates, and fully claimed promotion notifications in your business settings.",
        detail: "Control the updates you receive.",
    },
    {
        icon: FiSettings,
        title: "Manage multiple businesses",
        description:
            "Access your businesses from one account and switch between their dashboards, promotions, and customer activity.",
        detail: "One place to find the businesses you belong to.",
    },
];

export default function BusinessFeaturesPage() {
    return (
        <main className="overflow-hidden bg-background text-foreground">
            {/* Introduction */}
            <section className="relative isolate border-b">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 -z-10 size-96 rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
                    <div className="max-w-3xl">
                        <Badge variant="secondary">
                            Promotello business features
                        </Badge>

                        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                            From a good offer to a{" "}
                            <span className="text-[#FF593F]">
                                great first visit.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                            Create promotions, give customers a reason to visit,
                            and keep your team organised. Promotello brings the
                            everyday tools together in one business dashboard.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
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

                    <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {highlights.map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <div key={feature.title}>
                                    <span className="flex size-11 items-center justify-center rounded-2xl bg-[#FF593F]/10 text-[#FF593F]">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>

                                    <h2 className="mt-4 text-lg font-semibold">
                                        {feature.title}
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Promotion creation */}
            <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        Create promotions
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Give your next offer a place to shine.
                    </h2>

                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        A weekday special, an introductory experience, or a
                        bundle worth sharing. Present your promotion clearly so
                        customers know what they can enjoy and how to claim it.
                    </p>

                    <ul className="mt-6 space-y-3">
                        {promotionDetails.map((detail) => (
                            <li
                                key={detail}
                                className="flex items-start gap-3"
                            >
                                <FiCheck
                                    aria-hidden="true"
                                    className="mt-1 size-5 shrink-0 text-[#FF593F]"
                                />

                                <span className="text-muted-foreground">
                                    {detail}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-6 text-sm leading-6 text-muted-foreground">
                        Businesses and promotions are reviewed before they
                        appear publicly.
                    </p>
                </div>

                {/* Replace this illustration with a product screenshot later. */}
                <div className="rounded-[2rem] border bg-muted/30 p-5 sm:p-8">
                    <Card className="overflow-hidden rounded-3xl shadow-sm">
                        <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-[#17233B]">
                            <div
                                aria-hidden="true"
                                className="absolute -right-10 -top-12 size-48 rounded-full bg-[#FF593F]/30"
                            />

                            <FiGift
                                aria-hidden="true"
                                className="relative size-16 text-[#FF8F7D]"
                            />
                        </div>

                        <CardHeader>
                            <Badge variant="secondary" className="w-fit">
                                Example promotion
                            </Badge>

                            <CardTitle className="pt-2 text-2xl">
                                Make lunch your favourite part of the day.
                            </CardTitle>

                            <CardDescription className="leading-6">
                                A weekday offer with a clear description,
                                availability, and terms.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    Weekdays
                                </Badge>

                                <Badge variant="outline">
                                    Limited claims
                                </Badge>

                                <Badge variant="outline">
                                    Clear expiry
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Claim limits */}
            <section className="bg-[#17233B] text-white">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-2">
                    <div>
                        <Badge
                            variant="outline"
                            className="border-white/25 text-white"
                        >
                            Promotion controls
                        </Badge>

                        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                            An attractive offer. A comfortable commitment.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-white/70">
                            Decide how many claims your business can accommodate.
                            Set an optional total limit and an expiry date, then
                            follow how much availability remains.
                        </p>

                        <p className="mt-5 leading-7 text-white/70">
                            When the claim limit is reached, further claims are
                            stopped. Your terms explain when and how customers
                            can use their deal.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            {
                                icon: FiSliders,
                                title: "Claim limits",
                                description:
                                    "Choose the total number of available claims.",
                            },
                            {
                                icon: FiClock,
                                title: "Expiry dates",
                                description:
                                    "Give every promotion a clear end date.",
                            },
                            {
                                icon: FiBell,
                                title: "Inventory updates",
                                description:
                                    "Configure alerts as availability runs low.",
                            },
                            {
                                icon: FiCheckCircle,
                                title: "Clear terms",
                                description:
                                    "Set expectations before a customer claims.",
                            },
                        ].map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <div
                                    key={feature.title}
                                    className="rounded-3xl border border-white/15 bg-white/5 p-6"
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-6 text-[#FF8F7D]"
                                    />

                                    <h3 className="mt-4 font-semibold">
                                        {feature.title}
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-white/65">
                                        {feature.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Redemption workflow */}
            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        Customer redemptions
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        A clear process for your team and your customers.
                    </h2>

                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        A claim shows interest. A used code records fulfilment.
                        Keep both visible so your team can follow what has
                        happened.
                    </p>
                </div>

                <ol className="mt-12 grid gap-6 md:grid-cols-3">
                    {[
                        {
                            number: "01",
                            title: "The customer claims",
                            description:
                                "They claim an available promotion and receive a redemption code.",
                        },
                        {
                            number: "02",
                            title: "They visit your business",
                            description:
                                "They present their code to your team when they want to use the deal.",
                        },
                        {
                            number: "03",
                            title: "Your team marks it as used",
                            description:
                                "Find the redemption and record that the promotion has been fulfilled.",
                        },
                    ].map((step) => (
                        <li
                            key={step.number}
                            className="rounded-3xl border p-6 sm:p-8"
                        >
                            <span className="text-sm font-semibold text-[#FF593F]">
                                {step.number}
                            </span>

                            <h3 className="mt-4 text-xl font-semibold">
                                {step.title}
                            </h3>

                            <p className="mt-3 leading-7 text-muted-foreground">
                                {step.description}
                            </p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Business profile */}
            <section className="border-y bg-muted/30">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-2">
                    <div>
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FF593F]/10 text-[#FF593F]">
                            <FiMapPin
                                aria-hidden="true"
                                className="size-6"
                            />
                        </span>

                        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Let customers get to know you before they arrive.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-muted-foreground">
                            Your public business profile brings your story,
                            practical information, and available promotions
                            together in one place.
                        </p>

                        <p className="mt-5 leading-7 text-muted-foreground">
                            Help someone move from “that looks interesting” to
                            knowing where to go and what to expect.
                        </p>
                    </div>

                    <Card className="rounded-3xl shadow-none">
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                Your business, introduced properly.
                            </CardTitle>

                            <CardDescription className="leading-6">
                                The details customers need to plan their visit.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <ul className="space-y-4">
                                {profileDetails.map((detail) => (
                                    <li
                                        key={detail}
                                        className="flex items-center gap-3"
                                    >
                                        <FiCheckCircle
                                            aria-hidden="true"
                                            className="size-5 shrink-0 text-[#FF593F]"
                                        />

                                        <span>{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Reporting */}
            <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        Understand the response
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Make your next promotion a more informed one.
                    </h2>

                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        See how your promotions are being claimed and used.
                        Follow the activity in your dashboard and use what you
                        learn when planning your next offer.
                    </p>

                    <p className="mt-5 leading-7 text-muted-foreground">
                        A claim doesn’t guarantee a visit or a sale. Keeping
                        claims and used redemptions separate gives you a clearer
                        picture of customer behaviour.
                    </p>
                </div>

                <div className="space-y-4">
                    {[
                        {
                            title: "Promotion activity",
                            description:
                                "See the claims recorded against your promotions.",
                        },
                        {
                            title: "Redemption status",
                            description:
                                "Distinguish codes awaiting use from those marked as used.",
                        },
                        {
                            title: "Remaining availability",
                            description:
                                "Follow usage against the claim limits you set.",
                        },
                    ].map((item) => (
                        <Card
                            key={item.title}
                            className="rounded-2xl shadow-none"
                        >
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {item.title}
                                </CardTitle>

                                <CardDescription className="leading-6">
                                    {item.description}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Supporting tools */}
            <section className="border-t bg-muted/30">
                <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            The everyday details, taken care of.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-muted-foreground">
                            Keep your people, businesses, and updates organised
                            as you go.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-3">
                        {supportingFeatures.map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <Card
                                    key={feature.title}
                                    className="flex flex-col rounded-3xl shadow-none"
                                >
                                    <CardHeader>
                                        <Icon
                                            aria-hidden="true"
                                            className="size-6 text-[#FF593F]"
                                        />

                                        <CardTitle className="pt-3 text-xl">
                                            {feature.title}
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="flex flex-1 flex-col">
                                        <p className="leading-7 text-muted-foreground">
                                            {feature.description}
                                        </p>

                                        <p className="mt-auto pt-5 text-sm font-medium">
                                            {feature.detail}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Final call to action */}
            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
                <div className="rounded-[2rem] bg-[#FFF4E8] px-6 py-14 text-center sm:px-12 sm:py-20">
                    <div className="mx-auto max-w-2xl">
                        <Badge variant="secondary">
                            Start with your next idea
                        </Badge>

                        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#17233B] sm:text-5xl">
                            You know your business.
                            <br />
                            Let’s help customers discover it.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-[#17233B]/70">
                            Explore the pricing, create your profile, and build
                            a promotion that works for you.
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

                        <p className="mt-6 text-sm text-[#17233B]/65">
                            Have a question?{" "}
                            <Link
                                href="/business/contact"
                                className="font-medium underline underline-offset-4"
                            >
                                Talk to us
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}