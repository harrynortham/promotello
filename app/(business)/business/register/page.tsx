"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    FiArrowRight,
    FiCheck,
    FiGift,
    FiMapPin,
} from "react-icons/fi";

import { Skeleton } from "@/components/ui/skeleton";
import { safeNextPath } from "@/lib/redirects";
import { EmailCodeForm } from "@/components/email-code-form";
import { SocialSignIn } from "@/components/social-sign-in";

const benefits = [
    "Create offers on your terms",
    "Choose your claim limits and expiry dates",
    "Manage customer codes with your team",
];

function BusinessRegisterForm() {
    // Claiming a preview sends people here with ?next= pointing back at it,
    // so they land on their own business rather than in onboarding.
    const requestedNext = safeNextPath(useSearchParams().get("next"));
    const next = requestedNext ?? "/business/setup/new";

    const signInHref = requestedNext
        ? `/login?next=${encodeURIComponent(requestedNext)}`
        : "/login?next=/business/dashboard";

    return (
        <main className="min-h-dvh bg-background text-foreground">
            <div className="grid min-h-dvh lg:grid-cols-[3fr_2fr]">
                {/* Form: 60% on desktop */}
                <section className="flex flex-col px-6 py-7 sm:px-12 lg:px-16">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <Link
                            href="/business"
                            aria-label="Promotello for business home"
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

                    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12 lg:py-16">
                        <>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                                    Promotello for business
                                </p>

                                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-nowrap sm:text-4xl">
                                    Win your next customer.
                                </h1>

                                <p className="mt-4 leading-7 text-muted-foreground">
                                    Create your personal login first. Then
                                    we’ll help you add your business and
                                    prepare your first offer.
                                </p>

                                <SocialSignIn next={next} />

                                <EmailCodeForm
                                    mode="sign-up"
                                    next={next}
                                    idPrefix="register"
                                    collectName
                                    submitLabel="Create your account"
                                    otherWayHref={signInHref}
                                />

                                <div className="mt-7 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Already use Promotello?{" "}
                                        <Link
                                            href={signInHref}
                                            className="font-medium text-foreground underline underline-offset-4"
                                        >
                                            Sign in with your existing account
                                        </Link>
                                    </p>
                                </div>

                                <p className="mt-6 border-t pt-6 text-xs leading-6 text-muted-foreground">
                                    By creating an account, you agree to
                                    our{" "}
                                    <Link
                                        href="/legal/terms"
                                        className="text-foreground underline underline-offset-4"
                                    >
                                        Terms of Service
                                    </Link>
                                    . Read our{" "}
                                    <Link
                                        href="/legal/privacy"
                                        className="text-foreground underline underline-offset-4"
                                    >
                                        Privacy Policy
                                    </Link>{" "}
                                    to understand how we handle your
                                    information. A few trades we can&apos;t
                                    list, and some we list once we&apos;ve seen
                                    a licence:{" "}
                                    <Link
                                        href="/legal/restricted-businesses"
                                        className="text-foreground underline underline-offset-4"
                                    >
                                        restricted businesses
                                    </Link>
                                    .
                                </p>
                        </>
                    </div>
                </section>

                {/* Marketing visual: 40% on desktop */}
                <aside className="relative hidden overflow-hidden bg-[#17233B] text-white lg:flex lg:items-center">
                    {/*
                        Future image placement:
                        Add a full-height marketing photo here with
                        absolute positioning, then retain a dark overlay
                        behind the text for readability.
                    */}

                    <div
                        aria-hidden="true"
                        className="absolute -right-32 -top-24 size-[30rem] rounded-full bg-[#FF593F]/20 blur-3xl"
                    />

                    <div
                        aria-hidden="true"
                        className="absolute -bottom-24 -left-28 size-96 rounded-full border-[48px] border-white/5"
                    />

                    <div className="relative w-full px-10 py-16 xl:px-14">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/80">
                            <FiMapPin
                                aria-hidden="true"
                                className="text-[#FF8F7D]"
                            />
                            Built around local discovery
                        </span>

                        <p className="mt-7 text-lg leading-8 text-white/70">
                            Give people a reason to discover your business,
                            try something new, and walk through your door.
                        </p>

                        <div className="relative my-10 rounded-3xl border border-white/15 bg-white/5 p-6">
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FF593F] text-[#17233B]">
                                <FiGift
                                    aria-hidden="true"
                                    className="size-6"
                                />
                            </span>

                            <p className="mt-5 text-2xl font-semibold leading-tight">
                                One good offer.
                                <br />
                                A new introduction.
                            </p>

                            <p className="mt-3 text-sm leading-7 text-white/65">
                                From discovering your offer to enjoying
                                it in person.
                            </p>

                            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-white/80">
                                <span className="rounded-full bg-white/10 px-3 py-2">
                                    Discover
                                </span>
                                <FiArrowRight aria-hidden="true" />
                                <span className="rounded-full bg-white/10 px-3 py-2">
                                    Claim
                                </span>
                                <FiArrowRight aria-hidden="true" />
                                <span className="rounded-full bg-white/10 px-3 py-2">
                                    Visit
                                </span>
                            </div>
                        </div>

                        <ul className="space-y-4">
                            {benefits.map((benefit) => (
                                <li
                                    key={benefit}
                                    className="flex items-start gap-3 text-sm leading-6 text-white/80"
                                >
                                    <FiCheck
                                        aria-hidden="true"
                                        className="mt-1 size-4 shrink-0 text-[#FF8F7D]"
                                    />
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </main>
    );
}

export default function BusinessRegisterPage() {
    return (
        <Suspense fallback={<RegisterLoading />}>
            <BusinessRegisterForm />
        </Suspense>
    );
}

function RegisterLoading() {
    return (
        <main className="min-h-dvh bg-background">
            <div className="grid min-h-dvh lg:grid-cols-[3fr_2fr]">
                <div className="flex items-center justify-center px-6 py-12">
                    <div
                        role="status"
                        aria-label="Loading sign up"
                        className="w-full max-w-md space-y-5"
                    >
                        <Skeleton className="size-12 rounded-2xl" />
                        <Skeleton className="w-3/4" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="w-full" />
                    </div>
                </div>
            </div>
        </main>
    );
}
