"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    FiArrowLeft,
    FiArrowRight,
    FiCheckCircle,
    FiEye,
    FiEyeOff,
    FiLock,
} from "react-icons/fi";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError, invalidProps } from "@/components/field-error";
import { password, passwordsMatch, passwordsMatchError } from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";

type SessionStatus = "loading" | "ready" | "unavailable";

const schema = z
    .object({ password, confirmPassword: z.string() })
    .refine(passwordsMatch, passwordsMatchError);

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
    const [sessionStatus, setSessionStatus] =
        useState<SessionStatus>("loading");

    const [showPassword, setShowPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    useEffect(() => {
        let isMounted = true;

        async function checkSession() {
            try {
                const supabase = createClient();

                const {
                    data: { user },
                    error,
                } = await supabase.auth.getUser();

                if (isMounted) {
                    setSessionStatus(
                        !error && user ? "ready" : "unavailable",
                    );
                }
            } catch {
                if (isMounted) {
                    setSessionStatus("unavailable");
                }
            }
        }

        void checkSession();

        return () => {
            isMounted = false;
        };
    }, []);

    async function onSubmit(values: Values) {
        if (sessionStatus !== "ready" || isSuccess) return;

        setErrorMessage("");

        const supabase = createClient();
        const {
            data: { user },
            error: sessionError,
        } = await supabase.auth.getUser();

        if (sessionError || !user) {
            setSessionStatus("unavailable");
            return;
        }

        const { error } = await supabase.auth.updateUser({ password: values.password });

        if (error) {
            setErrorMessage(error.message || "We couldn’t update your password. Please try again.");
            return;
        }

        reset();
        setIsSuccess(true);
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
                        {isSuccess ? (
                            <div role="status" aria-live="polite">
                                <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <FiCheckCircle
                                        aria-hidden="true"
                                        className="size-7"
                                    />
                                </span>

                                <h1 className="mt-6 text-4xl font-semibold tracking-tight">
                                    Password updated.
                                </h1>

                                <p className="mt-5 leading-8 text-muted-foreground">
                                    Your new password is saved. Use it the
                                    next time you log in to Promotello.
                                </p>

                                <Button
                                    render={<Link href="/account" />}
                                    nativeButton={false}
                                    size="lg"
                                    className="mt-7 w-full"
                                >
                                    Continue to your account
                                    <FiArrowRight aria-hidden="true" />
                                </Button>
                            </div>
                        ) : sessionStatus === "loading" ? (
                            <div
                                role="status"
                                aria-label="Checking your session"
                                className="space-y-5"
                            >
                                <Skeleton className="size-12 rounded-2xl" />
                                <Skeleton className="h-10 w-3/4" />
                                <Skeleton className="h-6 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />

                                <p className="text-sm text-muted-foreground">
                                    Checking your session…
                                </p>
                            </div>
                        ) : sessionStatus === "unavailable" ? (
                            <div>
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <FiLock
                                        aria-hidden="true"
                                        className="size-6"
                                    />
                                </span>

                                <h1 className="mt-6 text-4xl font-semibold tracking-tight">
                                    Let’s get you a reset link.
                                </h1>

                                <p className="mt-5 leading-8 text-muted-foreground">
                                    We couldn’t verify an active session.
                                    Request a password reset email and open
                                    its link to continue.
                                </p>

                                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                    If you already received a link, it may
                                    have expired or already been used.
                                </p>

                                <Button
                                    render={
                                        <Link href="/forgot-password" />
                                    }
                                    nativeButton={false}
                                    size="lg"
                                    className="mt-7 w-full"
                                >
                                    Request reset link
                                    <FiArrowRight aria-hidden="true" />
                                </Button>
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
                                    A fresh start.
                                </h1>

                                <p className="mt-4 leading-7 text-muted-foreground">
                                    Choose a new password for your Promotello
                                    account. Use something unique that you
                                    don’t use elsewhere.
                                </p>

                                <form
                                    onSubmit={handleSubmit(onSubmit)}
                                    noValidate
                                    className="mt-8 space-y-5"
                                    aria-busy={isSubmitting}
                                >
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="reset-password"
                                            className="flex items-center gap-2"
                                        >
                                            <FiLock
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            New password
                                        </Label>

                                        <div className="relative">
                                            <Input
                                                id="reset-password"
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                autoComplete="new-password"
                                                placeholder="Create a new password"
                                                readOnly={isSubmitting}
                                                aria-describedby="password-help"
                                                className="h-12 pr-12"
                                                {...register("password")}
                                                aria-invalid={errors.password ? true : undefined}
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
                                            id="password-help"
                                            className={`text-xs leading-6 ${errors.password ? "text-destructive" : "text-muted-foreground"}`}
                                            role={errors.password ? "alert" : undefined}
                                        >
                                            {errors.password?.message ??
                                                "Use at least 8 characters. Any additional account password requirements also apply."}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="reset-confirm-password"
                                            className="flex items-center gap-2"
                                        >
                                            <FiLock
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Confirm new password
                                        </Label>

                                        <Input
                                            id="reset-confirm-password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            autoComplete="new-password"
                                            placeholder="Enter your new password again"
                                            readOnly={isSubmitting}
                                            className="h-12"
                                            {...register("confirmPassword")}
                                            {...invalidProps("reset-confirm-error", errors.confirmPassword)}
                                        />

                                        <FieldError id="reset-confirm-error" message={errors.confirmPassword?.message} />
                                    </div>

                                    {errorMessage && (
                                        <Alert variant="destructive">
                                            <AlertTitle>
                                                Unable to update password
                                            </AlertTitle>

                                            <AlertDescription>
                                                <p>{errorMessage}</p>

                                                <p className="mt-2">
                                                    If your reset link has
                                                    expired,{" "}
                                                    <Link
                                                        href="/forgot-password"
                                                        className="font-medium underline underline-offset-4"
                                                    >
                                                        request a new link
                                                    </Link>
                                                    .
                                                </p>
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
                                            ? "Updating password…"
                                            : "Update password"}
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>
                                </form>

                                <div className="mt-8 border-t pt-6">
                                    <p className="text-center text-sm leading-7 text-muted-foreground">
                                        Need another reset link?{" "}
                                        <Link
                                            href="/forgot-password"
                                            className="font-semibold text-foreground underline underline-offset-4"
                                        >
                                            Request one
                                        </Link>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <nav
                        aria-label="Password reset support and policies"
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