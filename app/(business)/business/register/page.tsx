"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    FiArrowRight,
    FiCheck,
    FiCheckCircle,
    FiEye,
    FiEyeOff,
    FiGift,
    FiLock,
    FiMail,
    FiMapPin,
    FiUser,
} from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

const benefits = [
    "Create promotions on your terms",
    "Choose your claim limits and expiry dates",
    "Manage customer codes with your team",
];

export default function BusinessRegisterPage() {
    const router = useRouter();
    const submittingRef = useRef(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [confirmationEmail, setConfirmationEmail] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current) return;

        const form = event.currentTarget;
        const values = new FormData(form);

        const name = String(values.get("name") ?? "").trim();
        const email = String(values.get("email") ?? "").trim();
        const password = String(values.get("password") ?? "");
        const confirmation = String(
            values.get("confirmPassword") ?? "",
        );

        setErrorMessage("");

        if (!name) {
            setErrorMessage("Please enter your name.");
            return;
        }

        if (password.length < 8) {
            setErrorMessage(
                "Choose a password with at least 8 characters.",
            );
            return;
        }

        if (password !== confirmation) {
            setErrorMessage("Your passwords do not match.");
            return;
        }

        submittingRef.current = true;
        setIsSubmitting(true);

        try {
            const supabase = createClient();

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                    emailRedirectTo:
                        `${window.location.origin}/auth/callback` +
                        "?next=/onboarding",
                },
            });

            if (error) throw error;

            form.reset();

            if (data.session) {
                router.replace("/onboarding");
                router.refresh();
                return;
            }

            setConfirmationEmail(email);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "We couldn’t create your account. Please try again.",
            );
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
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

                        <Button
                            render={
                                <Link href="/login?next=/business/dashboard" />
                            }
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            Sign in
                            <FiArrowRight aria-hidden="true" />
                        </Button>
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
                                    If registration requires confirmation,
                                    you’ll receive instructions at{" "}
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
                                        <Link href="/login?next=/business/dashboard" />
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

                                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Your next customer starts with an
                                    introduction.
                                </h1>

                                <p className="mt-4 leading-7 text-muted-foreground">
                                    Create your personal login first. Then
                                    we’ll help you add your business and
                                    prepare your first promotion.
                                </p>

                                <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        1
                                    </span>
                                    <span className="font-medium text-foreground">
                                        Create account
                                    </span>

                                    <span
                                        aria-hidden="true"
                                        className="h-px w-6 bg-border"
                                    />

                                    <span className="flex size-6 items-center justify-center rounded-full bg-muted">
                                        2
                                    </span>
                                    <span>Add business</span>
                                </div>

                                <form
                                    onSubmit={handleSubmit}
                                    className="mt-8 space-y-5"
                                    aria-busy={isSubmitting}
                                >
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="register-name"
                                            className="flex items-center gap-2"
                                        >
                                            <FiUser
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Your name
                                        </Label>

                                        <Input
                                            id="register-name"
                                            name="name"
                                            autoComplete="name"
                                            placeholder="Your full name"
                                            required
                                            maxLength={100}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="register-email"
                                            className="flex items-center gap-2"
                                        >
                                            <FiMail
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Email address
                                        </Label>

                                        <Input
                                            id="register-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@yourbusiness.com"
                                            required
                                            maxLength={254}
                                            disabled={isSubmitting}
                                        />

                                        <p className="text-xs leading-6 text-muted-foreground">
                                            Use an address you can access.
                                            This will be your personal login.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="register-password"
                                            className="flex items-center gap-2"
                                        >
                                            <FiLock
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Password
                                        </Label>

                                        <div className="relative">
                                            <Input
                                                id="register-password"
                                                name="password"
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                autoComplete="new-password"
                                                placeholder="Create a password"
                                                required
                                                minLength={8}
                                                disabled={isSubmitting}
                                                className="pr-12"
                                            />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={
                                                    showPassword
                                                        ? "Hide passwords"
                                                        : "Show passwords"
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

                                        <p className="text-xs leading-6 text-muted-foreground">
                                            Use at least 8 characters and
                                            choose a unique password.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="register-confirm-password"
                                            className="flex items-center gap-2"
                                        >
                                            <FiLock
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Confirm password
                                        </Label>

                                        <Input
                                            id="register-confirm-password"
                                            name="confirmPassword"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            autoComplete="new-password"
                                            placeholder="Enter your password again"
                                            required
                                            minLength={8}
                                            disabled={isSubmitting}
                                        />
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

                                    <p className="text-xs leading-6 text-muted-foreground">
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
                                        information.
                                    </p>

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

                                    <p className="text-center text-xs leading-6 text-muted-foreground">
                                        Creating an account does not start
                                        a paid subscription.
                                    </p>
                                </form>

                                <div className="mt-7 border-t pt-6 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Already use Promotello?{" "}
                                        <Link
                                            href="/login?next=/business/dashboard"
                                            className="font-medium text-foreground underline underline-offset-4"
                                        >
                                            Sign in with your existing account
                                        </Link>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        <Link
                            href="/business/contact"
                            className="hover:underline"
                        >
                            Need help?
                        </Link>
                        <Link
                            href="/legal/privacy"
                            className="hover:underline"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/legal/terms"
                            className="hover:underline"
                        >
                            Terms
                        </Link>
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

                        <h2 className="mt-7 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                            Someone’s next favourite could be you.
                        </h2>

                        <p className="mt-5 text-lg leading-8 text-white/70">
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
                                From discovering your promotion to enjoying
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