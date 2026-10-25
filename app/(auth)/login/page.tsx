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
    FiEye,
    FiEyeOff,
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
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError, invalidProps } from "@/components/field-error";
import { safeNextPath } from "@/lib/redirects";
import { email } from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";

const schema = z.object({
    email,
    password: z.string().min(1, "Enter your password."),
});

type Values = z.infer<typeof schema>;

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const requestedNext = safeNextPath(searchParams.get("next"));

    const isBusinessLogin = requestedNext === "/business/dashboard";

    // Return to the page that asked for sign-in, e.g. an offer being claimed.
    const destination = requestedNext ?? "/dashboard";

    const registerHref = isBusinessLogin
        ? "/business/register"
        : requestedNext
            ? `/signup?next=${encodeURIComponent(requestedNext)}`
            : "/signup";

    const hasCallbackError = Boolean(searchParams.get("error"));

    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    // Stays true after success, while the next page loads.
    const [isRedirecting, setIsRedirecting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting: isSending },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        // Prefilled from invitation links (?email=).
        defaultValues: { email: searchParams.get("email") ?? "", password: "" },
    });

    const isSubmitting = isSending || isRedirecting;

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const { error } = await createClient().auth.signInWithPassword(values);

        if (error) {
            setErrorMessage(error.message || "We couldn’t sign you in. Please try again.");
            return;
        }

        setIsRedirecting(true);
        router.replace(destination);
        router.refresh();
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
                            render={<Link href={registerHref} />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            Create an account
                            <FiArrowRight aria-hidden="true" />
                        </Button> */}
                    </div>

                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 lg:py-20">
                        {/* <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <FiLock
                                aria-hidden="true"
                                className="size-6"
                            />
                        </span> */}

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                            Welcome back.
                        </h1>

                        <p className="mt-4 leading-7 text-muted-foreground">
                            Enter your details to sign in to your Promotello
                            account.
                        </p>

                        {hasCallbackError && (
                            <Alert className="mt-6">
                                <AlertTitle>
                                    That email link couldn’t be completed
                                </AlertTitle>

                                <AlertDescription>
                                    It may have expired or already been used.
                                    Try signing in below. If you were resetting
                                    your password, request a new reset link.
                                </AlertDescription>
                            </Alert>
                        )}

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            noValidate
                            className="mt-8 space-y-5"
                            aria-busy={isSubmitting}
                        >
                            <div className="space-y-2">
                                <Label
                                    htmlFor="login-email"
                                    className="flex items-center gap-2"
                                >
                                    <FiMail
                                        aria-hidden="true"
                                        className="size-4 text-muted-foreground"
                                    />
                                    Email address
                                </Label>

                                <Input
                                    id="login-email"
                                    type="email"
                                    autoComplete="username"
                                    placeholder="you@example.com"
                                    readOnly={isSubmitting}
                                    className="h-12"
                                    {...register("email")}
                                    {...invalidProps("login-email-error", errors.email)}
                                />

                                <FieldError id="login-email-error" message={errors.email?.message} />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="login-password"
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
                                        id="login-password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="current-password"
                                        placeholder="Your password"
                                        readOnly={isSubmitting}
                                        className="h-12 pr-12"
                                        {...register("password")}
                                        {...invalidProps("login-password-error", errors.password)}
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
                                        className="absolute right-2 top-1/2 size-8 -translate-y-1/2"
                                    >
                                        {showPassword ? (
                                            <FiEyeOff aria-hidden="true" />
                                        ) : (
                                            <FiEye aria-hidden="true" />
                                        )}
                                    </Button>
                                </div>

                                <FieldError id="login-password-error" message={errors.password?.message} />

                                <div className="text-right">
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs font-medium underline-offset-4 hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>
                                        Unable to sign in
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
                                {isSubmitting ? "Signing in…" : "Sign in"}
                                <FiArrowRight aria-hidden="true" />
                            </Button>
                        </form>

                        <div className="mt-8 border-t pt-6">
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

                    <nav
                        aria-label="Sign-in support and policies"
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
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
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