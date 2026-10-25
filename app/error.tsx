"use client";

import Image from "next/image";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import {
    FiArrowRight,
    FiCompass,
    FiLifeBuoy,
    FiRefreshCw,
    FiTool,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";

type ErrorPageProps = {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
};

export default function ErrorPage({
    error,
    reset,
}: ErrorPageProps) {
    useEffect(() => {
        console.error(error);
        Sentry.captureException(error);
    }, [error]);

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

            <div className="mx-auto w-full max-w-7xl px-6 py-7 sm:px-10">
                <Link
                    href="/"
                    aria-label="Promotello home"
                    className="inline-flex"
                >
                    <Image
                        src="/brand/promotello-horizontal-primary.svg"
                        alt="Promotello"
                        width={180}
                        height={48}
                        priority
                    />
                </Link>
            </div>

            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-10 sm:px-10 sm:py-16">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <section aria-labelledby="error-heading">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C8371D]">
                            A small bump in the journey
                        </p>

                        <h1
                            id="error-heading"
                            className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
                        >
                            We couldn’t finish loading this page.
                        </h1>

                        <p className="mt-5 max-w-lg text-lg leading-8 text-[#17233B]/65">
                            Something went wrong while handling your request.
                            Try loading this section again, or head home to
                            continue exploring.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                type="button"
                                onClick={reset}
                                size="lg"
                            >
                                <FiRefreshCw aria-hidden="true" />
                                Try again
                            </Button>

                            <Button
                                render={<Link href="/" />}
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Return home
                                <FiArrowRight aria-hidden="true" />
                            </Button>
                        </div>

                        <p className="mt-5 max-w-lg text-sm leading-6 text-[#17233B]/70">
                            If you were submitting a form or claiming an offer,
                            check whether it completed before submitting again.
                        </p>

                        {error.digest && (
                            <div className="mt-6 inline-block rounded-xl border border-[#17233B]/10 bg-white/70 px-4 py-3">
                                <p className="text-xs text-[#17233B]/70">
                                    Support reference
                                </p>

                                <p className="mt-1 break-all font-mono text-sm">
                                    {error.digest}
                                </p>
                            </div>
                        )}
                    </section>

                    <div
                        aria-hidden="true"
                        className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-[2rem] border border-[#17233B]/10 bg-white/70 px-6 py-12 sm:min-h-96"
                    >
                        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-[#FF593F]/10" />

                        <div className="absolute -bottom-10 -left-8 size-40 rounded-full border-[18px] border-[#17233B]/5" />

                        <div className="relative text-center">
                            <div className="relative mx-auto flex size-36 items-center justify-center rounded-full border-2 border-dashed border-[#FF593F]/30 sm:size-44">
                                <div className="flex size-24 items-center justify-center rounded-3xl bg-[#17233B] shadow-lg sm:size-28">
                                    <FiTool className="size-11 text-[#FF8F7D] sm:size-14" />
                                </div>

                                <span className="absolute bottom-0 right-0 flex size-12 items-center justify-center rounded-2xl border-4 border-[#FFF8F0] bg-[#C8371D] text-white">
                                    <FiRefreshCw className="size-5" />
                                </span>
                            </div>

                            <p className="mt-8 text-2xl font-semibold tracking-tight">
                                Let’s give that another go.
                            </p>

                            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#17233B]/70">
                                Your next local discovery can wait a moment.
                            </p>
                        </div>
                    </div>
                </div>

                <nav
                    aria-label="Other ways to continue"
                    className="mt-14 grid gap-4 sm:mt-16 md:grid-cols-2"
                >
                    <Link
                        href="/explore"
                        className="group flex items-start gap-4 rounded-2xl border border-[#17233B]/10 bg-white p-5 transition-colors hover:border-[#FF593F]/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FF593F]/10 text-[#C8371D]">
                            <FiCompass
                                aria-hidden="true"
                                className="size-5"
                            />
                        </span>

                        <div className="flex-1">
                            <p className="font-semibold">
                                Keep exploring
                            </p>

                            <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                Discover promotions and local favourites.
                            </p>
                        </div>

                        <FiArrowRight
                            aria-hidden="true"
                            className="mt-1 size-4 shrink-0 text-[#17233B]/65 transition-transform group-hover:translate-x-1"
                        />
                    </Link>

                    <Link
                        href="/contact"
                        className="group flex items-start gap-4 rounded-2xl border border-[#17233B]/10 bg-white p-5 transition-colors hover:border-[#FF593F]/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FF593F]/10 text-[#C8371D]">
                            <FiLifeBuoy
                                aria-hidden="true"
                                className="size-5"
                            />
                        </span>

                        <div className="flex-1">
                            <p className="font-semibold">
                                Get a little help
                            </p>

                            <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                Tell us what happened if the problem continues.
                            </p>
                        </div>

                        <FiArrowRight
                            aria-hidden="true"
                            className="mt-1 size-4 shrink-0 text-[#17233B]/65 transition-transform group-hover:translate-x-1"
                        />
                    </Link>
                </nav>
            </div>

            <div className="px-6 py-6 text-center text-xs text-[#17233B]/65">
                Promotello · Something went wrong
            </div>
        </main>
    );
}