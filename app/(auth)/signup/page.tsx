"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FiUserPlus } from "react-icons/fi";

import { EmailCodeForm } from "@/components/email-code-form";
import { SocialSignIn } from "@/components/social-sign-in";
import { safeNextPath } from "@/lib/redirects";

function SignupContent() {
    const searchParams = useSearchParams();

    // Return to the page that sent them here, e.g. an offer to claim.
    const requestedNext = safeNextPath(searchParams.get("next"));
    const next = requestedNext ?? "/dashboard";

    // Someone part-way through claiming an offer who finds they already
    // have an account should still end up at the offer.
    const loginHref = requestedNext
        ? `/login?next=${encodeURIComponent(requestedNext)}`
        : "/login";

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
                        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-nowrap sm:text-4xl">
                            Welcome to Promotello
                        </h1>

                        <p className="mt-4 leading-7 text-muted-foreground">
                            Create your Promotello account to claim offers and keep your
                            vouchers together.
                        </p>

                        <SocialSignIn next={next} />

                        <EmailCodeForm
                            mode="sign-up"
                            next={requestedNext ?? undefined}
                            idPrefix="signup"
                            // Prefilled from team invitations (?email=).
                            defaultEmail={searchParams.get("email") ?? ""}
                            otherWayHref={loginHref}
                        />

                        <div className="mt-8">
                            <p className="text-center text-sm leading-7 text-muted-foreground">
                                Already have an account?{" "}
                                <Link
                                    href={loginHref}
                                    className="font-semibold text-foreground underline underline-offset-4"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </div>

                        <p className="mt-6 border-t pt-6 text-xs leading-6 text-muted-foreground">
                            By creating an account, you agree to our{" "}
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
                            to understand how we handle your information.
                        </p>
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
                            <FiUserPlus className="size-14 text-[#FF8F7D]" />
                        </div>

                        <span className="absolute right-7 top-12 size-5 rounded-full bg-[#FF593F]" />

                        <span className="absolute bottom-12 left-8 size-3 rounded-full bg-white/30" />
                    </div>
                </aside>
            </div>
        </main>
    );
}

export default function SignupPage() {
    return (
        <Suspense>
            <SignupContent />
        </Suspense>
    );
}
