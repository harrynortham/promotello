"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    FiArrowRight,
    FiCheck,
    FiCheckCircle,
    FiEye,
    FiEyeOff,
    FiGift,
    FiMapPin,
} from "react-icons/fi";

import { Skeleton } from "@/components/ui/skeleton";
import { safeNextPath } from "@/lib/redirects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, invalidProps } from "@/components/field-error";
import { SocialSignIn } from "@/components/social-sign-in";
import { email, password, requiredText } from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";

const benefits = [
    "Create offers on your terms",
    "Choose your claim limits and expiry dates",
    "Manage customer codes with your team",
];

const schema = z.object({
    name: requiredText("Your name", { max: 100 }),
    email,
    password,
});

type Values = z.infer<typeof schema>;

function BusinessRegisterForm() {
    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [confirmationEmail, setConfirmationEmail] = useState("");
    const [isRedirecting, setIsRedirecting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting: isSending },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", email: "", password: "" },
    });

    const isSubmitting = isSending || isRedirecting;

    // Claiming a preview sends people here with ?next= pointing back at it,
    // so they land on their own business rather than in onboarding.
    const requestedNext = safeNextPath(useSearchParams().get("next"));

    function nextPath() {
        return requestedNext ?? "/onboarding";
    }

    const signInHref = requestedNext
        ? `/login?next=${encodeURIComponent(requestedNext)}`
        : "/login?next=/business/dashboard";

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const { data, error } = await createClient().auth.signUp({
            email: values.email,
            password: values.password,
            options: {
                data: { full_name: values.name },
                emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`,
            },
        });

        if (error) {
            setErrorMessage(error.message || "We couldn’t create your account. Please try again.");
            return;
        }

        reset();

        if (data.session) {
            setIsRedirecting(true);
            router.replace(nextPath());
            router.refresh();
            return;
        }

        setConfirmationEmail(values.email);
    }

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
                        {confirmationEmail ? (
                            <div role="status" aria-live="polite">
                                <span className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <FiCheckCircle
                                        aria-hidden="true"
                                        className="size-8"
                                    />
                                </span>

                                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                                    Your next step
                                </p>

                                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Check your inbox.
                                </h1>

                                <p className="mt-5 leading-8 text-muted-foreground">
                                    We’ve sent a confirmation link to{" "}
                                    <span className="break-all font-medium text-foreground">
                                        {confirmationEmail}
                                    </span>
                                    . Follow the link to verify your email and
                                    continue setting up your business.
                                </p>

                                <div className="mt-7 rounded-2xl border bg-muted/30 p-5">
                                    <h2 className="font-semibold">
                                        Already registered?
                                    </h2>

                                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                        Use your existing account to sign in.
                                        You don’t need a separate login to add
                                        a business.
                                    </p>
                                </div>

                                <Button
                                    render={
                                        <Link href={signInHref} />
                                    }
                                    nativeButton={false}
                                    size="lg"
                                    className="mt-7"
                                >
                                    Continue to sign in
                                    <FiArrowRight aria-hidden="true" />
                                </Button>

                                <p className="mt-6 text-sm leading-7 text-muted-foreground">
                                    Check your spam folder if an expected
                                    email hasn’t arrived. Still need help?{" "}
                                    <Link
                                        href="/business/contact"
                                        className="font-medium text-foreground underline underline-offset-4"
                                    >
                                        Contact us
                                    </Link>
                                    .
                                </p>
                            </div>
                        ) : (
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

                                <SocialSignIn next={nextPath} />

                                <form
                                    onSubmit={handleSubmit(onSubmit)}
                                    noValidate
                                    className="mt-6 space-y-5"
                                    aria-busy={isSubmitting}
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="register-name">
                                            Your name
                                        </Label>

                                        <Input
                                            id="register-name"
                                            autoComplete="name"
                                            placeholder="Your full name"
                                            maxLength={100}
                                            readOnly={isSubmitting}
                                            {...register("name")}
                                            {...invalidProps("register-name-error", errors.name)}
                                        />

                                        <FieldError id="register-name-error" message={errors.name?.message} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="register-email">
                                            Email address
                                        </Label>

                                        <Input
                                            id="register-email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@yourbusiness.com"
                                            maxLength={254}
                                            readOnly={isSubmitting}
                                            {...register("email")}
                                            {...invalidProps("register-email-error", errors.email)}
                                        />

                                        <FieldError id="register-email-error" message={errors.email?.message} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="register-password">
                                            Password
                                        </Label>

                                        <div className="relative">
                                            <Input
                                                id="register-password"
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                autoComplete="new-password"
                                                placeholder="Create a password"
                                                readOnly={isSubmitting}
                                                className="pr-12"
                                                {...register("password")}
                                                {...invalidProps("register-password-error", errors.password)}
                                            />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={
                                                    showPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                                aria-pressed={showPassword}
                                                disabled={isSubmitting}
                                                onClick={() =>
                                                    setShowPassword(
                                                        (current) => !current,
                                                    )
                                                }
                                                className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                                            >
                                                {showPassword ? (
                                                    <FiEyeOff aria-hidden="true" />
                                                ) : (
                                                    <FiEye aria-hidden="true" />
                                                )}
                                            </Button>
                                        </div>

                                        <FieldError id="register-password-error" message={errors.password?.message} />
                                    </div>

                                    {errorMessage && (
                                        <Alert variant="destructive">
                                            <AlertTitle>
                                                We couldn’t create your
                                                account
                                            </AlertTitle>

                                            <AlertDescription>
                                                {errorMessage}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting
                                            ? "Creating your account…"
                                            : "Create your account"}
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>
                                </form>

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
                        )}
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
