"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FiLock } from "react-icons/fi";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { EmailCodeForm } from "@/components/email-code-form";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialSignIn } from "@/components/social-sign-in";
import { safeNextPath } from "@/lib/redirects";

function LoginContent() {
    const searchParams = useSearchParams();

    const requestedNext = safeNextPath(searchParams.get("next"));

    const isBusinessLogin = requestedNext === "/business/dashboard";

    // Where to go when nothing asked for a particular page. A business
    // member is sent to their dashboard instead, which is worked out
    // after signing in because it takes a signed-in read.
    const destination = requestedNext ?? "/dashboard";

    const registerHref = isBusinessLogin
        ? "/business/register"
        : requestedNext
            ? `/signup?next=${encodeURIComponent(requestedNext)}`
            : "/signup";

    const callbackError = searchParams.get("error");
    const hasLinkError = Boolean(callbackError) && !["oauth", "session"].includes(callbackError!);
    const hasOAuthError = callbackError === "oauth";
    const hasSessionError = callbackError === "session";

    return (
        <main className="min-h-dvh bg-background text-foreground">
            <div className="grid min-h-dvh lg:grid-cols-[3fr_2fr]">
                <section className="flex flex-col px-6 py-7 sm:px-12 lg:px-16">
                    <div className="flex flex-wrap items-center justify-between gap-4">
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

                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 lg:py-20">
                        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-nowrap sm:text-4xl">
                            Log in to Promotello.
                        </h1>

                        {hasLinkError && (
                            <Alert className="mt-6">
                                <AlertTitle>That link couldn’t be completed</AlertTitle>

                                <AlertDescription>
                                    It may have expired or already been used. Put your email in
                                    below and we’ll send you a code.
                                </AlertDescription>
                            </Alert>
                        )}

                        {hasOAuthError && (
                            <Alert className="mt-6">
                                <AlertTitle>You weren’t signed in</AlertTitle>

                                <AlertDescription>
                                    Signing in with Google was cancelled or didn’t finish. Try
                                    again, or use your email below.
                                </AlertDescription>
                            </Alert>
                        )}

                        {hasSessionError && (
                            <Alert className="mt-6">
                                <AlertTitle>That didn’t quite finish</AlertTitle>

                                <AlertDescription>
                                    Your code was accepted but the sign-in didn’t stick, which
                                    usually means cookies are blocked. Try once more.
                                </AlertDescription>
                            </Alert>
                        )}

                        <SocialSignIn next={destination} />

                        <EmailCodeForm
                            mode="sign-in"
                            // Nothing asked for a page: the server decides,
                            // and a business owner lands in their business.
                            next={requestedNext ?? undefined}
                            idPrefix="login"
                            // Prefilled from invitation links (?email=).
                            defaultEmail={searchParams.get("email") ?? ""}
                            otherWayHref={registerHref}
                        />

                        <div className="mt-6 border-t pt-6">
                            <p className="text-center text-sm leading-7 text-muted-foreground">
                                Don’t have an account?{" "}
                                <Link
                                    href={registerHref}
                                    className="font-semibold text-foreground underline underline-offset-4"
                                >
                                    Create one
                                </Link>
                            </p>
                        </div>
                    </div>
                </section>

                <aside
                    aria-hidden="true"
                    className="relative hidden items-center justify-center overflow-hidden bg-[#17233B] lg:flex"
                >
                    <div className="absolute -right-32 -top-24 size-[30rem] rounded-full bg-[#FF593F]/20 blur-3xl" />

                    <div className="absolute -bottom-32 -left-32 size-[32rem] rounded-full border-[60px] border-white/5" />

                    <div className="absolute right-12 top-12 size-24 rounded-full border border-white/10" />

                    <div className="relative flex aspect-square w-3/4 max-w-sm items-center justify-center rounded-full border border-white/10">
                        <div className="absolute inset-8 rounded-full border border-dashed border-white/10" />

                        <div className="flex size-36 items-center justify-center rounded-[2rem] border border-white/15 bg-white/5 shadow-2xl">
                            <FiLock className="size-14 text-[#FF8F7D]" />
                        </div>

                        <span className="absolute right-7 top-12 size-5 rounded-full bg-[#FF593F]" />

                        <span className="absolute bottom-12 left-8 size-3 rounded-full bg-white/30" />
                    </div>
                </aside>
            </div>
        </main>
    );
}

function LoginLoading() {
    return (
        <main className="grid min-h-dvh bg-background lg:grid-cols-[3fr_2fr]">
            <div className="flex items-center justify-center px-6 py-12">
                <div
                    role="status"
                    aria-label="Loading sign in"
                    className="w-full max-w-md space-y-5"
                >
                    <Skeleton className="size-12 rounded-2xl" />
                    <Skeleton className="w-3/4" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="w-full" />
                    <Skeleton className="w-full" />
                </div>
            </div>

            <div
                aria-hidden="true"
                className="hidden bg-[#17233B] lg:block"
            />
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginLoading />}>
            <LoginContent />
        </Suspense>
    );
}
