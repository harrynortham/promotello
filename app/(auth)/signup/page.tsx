"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    FiArrowRight,
    FiCheckCircle,
    FiEye,
    FiEyeOff,
    FiLock,
    FiMail,
    FiUserPlus,
} from "react-icons/fi";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
    const router = useRouter();
    const submittingRef = useRef(false);

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [confirmationEmail, setConfirmationEmail] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current) return;

        const form = event.currentTarget;
        const values = new FormData(form);

        const email = String(values.get("email") ?? "").trim();
        const password = String(values.get("password") ?? "");
        const confirmPassword = String(
            values.get("confirmPassword") ?? "",
        );

        setErrorMessage("");

        if (password.length < 8) {
            setErrorMessage(
                "Choose a password with at least 8 characters.",
            );
            return;
        }

        if (password !== confirmPassword) {
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
                    emailRedirectTo:
                        `${window.location.origin}/auth/callback` +
                        "?next=/dashboard",
                },
            });

            if (error) throw error;

            form.reset();

            if (data.session) {
                router.replace("/dashboard");
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

                        {/* <Button
                            render={<Link href="/login" />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            Sign in
                            <FiArrowRight aria-hidden="true" />
                        </Button> */}
                    </div>

                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 lg:py-20">
                        {confirmationEmail ? (
                            <div role="status" aria-live="polite">
                                <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <FiCheckCircle
                                        aria-hidden="true"
                                        className="size-7"
                                    />
                                </span>

                                <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Check your inbox.
                                </h1>

                                <p className="mt-5 leading-8 text-muted-foreground">
                                    Check{" "}
                                    <span className="break-all font-medium text-foreground">
                                        {confirmationEmail}
                                    </span>{" "}
                                    for account confirmation instructions.
                                    If confirmation is required, follow the
                                    link to finish setting up your account.
                                </p>

                                <div className="mt-6 rounded-2xl border bg-muted/30 p-5">
                                    <h2 className="font-semibold">
                                        Already have an account?
                                    </h2>

                                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                        You can sign in with your existing
                                        details. You don’t need a second
                                        account.
                                    </p>
                                </div>

                                <Button
                                    render={<Link href="/login" />}
                                    nativeButton={false}
                                    size="lg"
                                    className="mt-7"
                                >
                                    Continue to sign in
                                    <FiArrowRight aria-hidden="true" />
                                </Button>

                                <p className="mt-6 text-sm leading-7 text-muted-foreground">
                                    Check your spam folder if an expected
                                    email hasn’t arrived.{" "}
                                    <Link
                                        href="/contact"
                                        className="font-medium text-foreground underline underline-offset-4"
                                    >
                                        Contact us
                                    </Link>{" "}
                                    if you need help.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <FiUserPlus
                                        aria-hidden="true"
                                        className="size-6"
                                    />
                                </span> */}

                                <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                                    Make yourself at home.
                                </h1>

                                <p className="mt-4 leading-7 text-muted-foreground">
                                    Create your Promotello account to claim
                                    promotions and keep your vouchers together.
                                </p>

                                <form
                                    onSubmit={handleSubmit}
                                    className="mt-8 space-y-5"
                                    aria-busy={isSubmitting}
                                >
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="signup-email"
                                            className="flex items-center gap-2"
                                        >
                                            <FiMail
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Email address
                                        </Label>

                                        <Input
                                            id="signup-email"
                                            name="email"
                                            type="email"
                                            autoComplete="username"
                                            placeholder="you@example.com"
                                            required
                                            maxLength={254}
                                            disabled={isSubmitting}
                                            className="h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="signup-password"
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
                                                id="signup-password"
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
                                                aria-describedby="signup-password-help"
                                                className="h-12 pr-12"
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
                                                className="absolute right-2 top-1/2 size-8 -translate-y-1/2"
                                            >
                                                {showPassword ? (
                                                    <FiEyeOff aria-hidden="true" />
                                                ) : (
                                                    <FiEye aria-hidden="true" />
                                                )}
                                            </Button>
                                        </div>

                                        <p
                                            id="signup-password-help"
                                            className="text-xs leading-6 text-muted-foreground"
                                        >
                                            Use at least 8 characters and
                                            choose a unique password.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="signup-confirm-password"
                                            className="flex items-center gap-2"
                                        >
                                            <FiLock
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Confirm password
                                        </Label>

                                        <Input
                                            id="signup-confirm-password"
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
                                            className="h-12"
                                        />
                                    </div>

                                    {errorMessage && (
                                        <Alert variant="destructive">
                                            <AlertTitle>
                                                Unable to create account
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
                                            : "Create account"}
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>
                                </form>

                                <div className="mt-8 border-t pt-6">
                                    <p className="text-center text-sm leading-7 text-muted-foreground">
                                        Already have an account?{" "}
                                        <Link
                                            href="/login"
                                            className="font-semibold text-foreground underline underline-offset-4"
                                        >
                                            Sign in
                                        </Link>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <nav
                        aria-label="Registration support and policies"
                        className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
                    >
                        <Link href="/contact" className="hover:underline">
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
                    </nav>
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