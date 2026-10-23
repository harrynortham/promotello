"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
    FiArrowLeft,
    FiArrowRight,
    FiCheckCircle,
    FiLock,
    FiMail,
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

export default function ForgotPasswordPage() {
    const submittingRef = useRef(false);

    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current) return;

        submittingRef.current = true;
        setIsSubmitting(true);
        setErrorMessage("");

        const requestedEmail = email.trim();

        try {
            const supabase = createClient();

            const { error } =
                await supabase.auth.resetPasswordForEmail(
                    requestedEmail,
                    {
                        redirectTo:
                            `${window.location.origin}/auth/callback` +
                            "?next=/reset-password",
                    },
                );

            if (error) throw error;

            setSubmittedEmail(requestedEmail);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "We couldn’t send the reset link. Please try again.",
            );
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }

    function useAnotherEmail() {
        setSubmittedEmail("");
        setErrorMessage("");
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

                        <Button
                            render={<Link href="/login" />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            <FiArrowLeft aria-hidden="true" />
                            Back to login
                        </Button>
                    </div>

                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 lg:py-20">
                        {submittedEmail ? (
                            <div role="status" aria-live="polite">
                                <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <FiCheckCircle
                                        aria-hidden="true"
                                        className="size-7"
                                    />
                                </span>

                                <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                                    Check your inbox.
                                </h1>

                                <p className="mt-5 leading-8 text-muted-foreground">
                                    If an account exists for{" "}
                                    <span className="break-all font-medium text-foreground">
                                        {submittedEmail}
                                    </span>
                                    , you’ll receive an email with
                                    instructions to reset your password.
                                </p>

                                <div className="mt-6 rounded-2xl border bg-muted/30 p-5">
                                    <h2 className="font-semibold">
                                        What happens next?
                                    </h2>

                                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                                        <li>
                                            Open the password reset email.
                                        </li>
                                        <li>
                                            Follow the link to choose a new
                                            password.
                                        </li>
                                        <li>
                                            Use your new password the next
                                            time you log in.
                                        </li>
                                    </ol>
                                </div>

                                <p className="mt-5 text-sm leading-7 text-muted-foreground">
                                    Check your spam folder if the email
                                    hasn’t arrived. Reset links are private—
                                    don’t share them with anyone.
                                </p>

                                <div className="mt-7 flex flex-col gap-3">
                                    <Button
                                        render={<Link href="/login" />}
                                        nativeButton={false}
                                        size="lg"
                                        className="w-full"
                                    >
                                        Back to login
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={useAnotherEmail}
                                    >
                                        Use a different email
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <FiLock
                                        aria-hidden="true"
                                        className="size-6"
                                    />
                                </span>

                                <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                                    Forgotten your password?
                                </h1>

                                <p className="mt-4 leading-7 text-muted-foreground">
                                    Enter the email address for your account
                                    and we’ll help you set a new one.
                                </p>

                                <form
                                    onSubmit={handleSubmit}
                                    className="mt-8 space-y-5"
                                    aria-busy={isSubmitting}
                                >
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="reset-email"
                                            className="flex items-center gap-2"
                                        >
                                            <FiMail
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Email address
                                        </Label>

                                        <Input
                                            id="reset-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            maxLength={254}
                                            value={email}
                                            onChange={(event) =>
                                                setEmail(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="you@example.com"
                                            disabled={isSubmitting}
                                            className="h-12"
                                        />
                                    </div>

                                    {errorMessage && (
                                        <Alert variant="destructive">
                                            <AlertTitle>
                                                Unable to send reset link
                                            </AlertTitle>

                                            <AlertDescription>
                                                {errorMessage}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        size="lg"
                                        className="w-full"
                                    >
                                        {isSubmitting
                                            ? "Sending link…"
                                            : "Send reset link"}
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>
                                </form>

                                <div className="mt-8 border-t pt-6">
                                    <p className="text-center text-sm leading-7 text-muted-foreground">
                                        Remember your password?{" "}
                                        <Link
                                            href="/login"
                                            className="font-semibold text-foreground underline underline-offset-4"
                                        >
                                            Log in
                                        </Link>
                                    </p>
                                </div>
                            </>
                        )}

                        <p className="mt-7 text-center text-sm leading-7 text-muted-foreground">
                            Having trouble?{" "}
                            <Link
                                href="/contact"
                                className="font-medium text-foreground underline underline-offset-4"
                            >
                                Contact support
                            </Link>
                        </p>
                    </div>

                    <nav
                        aria-label="Password reset support and policies"
                        className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
                    >
                        <Link
                            href="/contact"
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
                            <FiMail className="size-14 text-[#FF8F7D]" />
                        </div>

                        <span className="absolute right-7 top-12 size-5 rounded-full bg-[#FF593F]" />

                        <span className="absolute bottom-12 left-8 size-3 rounded-full bg-white/30" />
                    </div>
                </aside>
            </div>
        </main>
    );
}