import Link from "next/link";
import {
    FiArrowRight,
    FiCompass,
    FiGift,
    FiMapPin,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";

const destinations = [
    {
        title: "Explore local deals",
        description: "Find your next favourite place.",
        href: "/explore",
        icon: FiCompass,
    },
    {
        title: "Browse promotions",
        description: "Discover something worth making plans for.",
        href: "/offers",
        icon: FiGift,
    },
    {
        title: "Meet local businesses",
        description: "See what’s around the corner.",
        href: "/businesses",
        icon: FiMapPin,
    },
];

export default function NotFound() {
    return (
        <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#FFF8F0] text-[#17233B]">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-32 -top-32 -z-10 size-[30rem] rounded-full bg-[#FF593F]/10 blur-3xl"
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 -left-32 -z-10 size-96 rounded-full bg-[#17233B]/5 blur-3xl"
            />

            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-10 sm:px-10 sm:py-16">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C8371D]">
                            A little off the beaten track
                        </p>

                        <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                            This wasn’t the discovery you had in mind.
                        </h1>

                        <p className="mt-5 max-w-lg text-lg leading-8 text-[#17233B]/65">
                            We couldn’t find this page. The link may have
                            changed, or the page may no longer be available.
                            Let’s find you somewhere worth visiting.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                render={<Link href="/explore" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Find a local favourite
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <Button
                                render={<Link href="/" />}
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Return home
                            </Button>
                        </div>
                    </div>

                    <div
                        aria-hidden="true"
                        className="relative flex min-h-72 items-center justify-center rounded-[2rem] border border-[#17233B]/10 bg-white/70 px-6 py-12 sm:min-h-96"
                    >
                        <div className="absolute left-8 top-8 size-12 rounded-full border-2 border-dashed border-[#FF593F]/30" />

                        <div className="absolute bottom-8 right-8 size-20 rounded-full bg-[#FFF4E8]" />

                        <div className="relative text-center">
                            <div className="flex items-center justify-center gap-2 text-[7rem] font-semibold leading-none tracking-tighter sm:text-[10rem]">
                                <span>4</span>

                                <span className="relative flex size-24 items-center justify-center rounded-full bg-[#FF593F] sm:size-36">
                                    <FiCompass className="size-14 text-white sm:size-20" />
                                </span>

                                <span>4</span>
                            </div>

                            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#17233B] px-4 py-2 text-xs font-medium text-white">
                                <FiMapPin className="size-3.5" />
                                Good discoveries are still nearby
                            </span>
                        </div>
                    </div>
                </div>

                <nav
                    aria-label="Suggested destinations"
                    className="mt-14 grid gap-4 sm:mt-20 md:grid-cols-3"
                >
                    {destinations.map((destination) => {
                        const Icon = destination.icon;

                        return (
                            <Link
                                key={destination.href}
                                href={destination.href}
                                className="group flex items-start gap-4 rounded-2xl border border-[#17233B]/10 bg-white p-5 transition-colors hover:border-[#FF593F]/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FF593F]/10 text-[#C8371D]">
                                    <Icon
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>

                                <div className="flex-1">
                                    <p className="font-semibold">
                                        {destination.title}
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                        {destination.description}
                                    </p>
                                </div>

                                <FiArrowRight
                                    aria-hidden="true"
                                    className="mt-1 size-4 shrink-0 text-[#17233B]/65 transition-transform group-hover:translate-x-1"
                                />
                            </Link>
                        );
                    })}
                </nav>

                <p className="mt-8 text-center text-sm text-[#17233B]/70">
                    Looking for the business side?{" "}
                    <Link
                        href="/business"
                        className="font-medium text-[#17233B] underline underline-offset-4"
                    >
                        Visit Promotello for business
                    </Link>
                </p>
            </div>

            <div className="px-6 py-6 text-center text-xs text-[#17233B]/65">
                Error 404 · Page not found
            </div>
        </main>
    );
}