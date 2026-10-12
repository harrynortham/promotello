"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setErrorMessage("");
        setSuccessMessage("");

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setErrorMessage("Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);

        const supabase = createClient();

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage(
            "Account created. Check your email to confirm your account.",
        );

        setEmail("");
        setPassword("");
        setConfirmPassword("");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
            <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm sm:p-10">
                <Link
                    href="/"
                    className="text-sm font-semibold text-[#FF593F]"
                >
                    ← Back to Promotello
                </Link>

                <h1 className="mt-8 text-3xl font-semibold tracking-tight">
                    Create your account
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Create an account to manage your businesses and promotions.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <label className="block text-sm font-medium">
                        Email address
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#17233B]/15 px-4 py-3 outline-none focus:border-[#FF593F]"
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className="block text-sm font-medium">
                        Password
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#17233B]/15 px-4 py-3 outline-none focus:border-[#FF593F]"
                            placeholder="At least 8 characters"
                        />
                    </label>

                    <label className="block text-sm font-medium">
                        Confirm password
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#17233B]/15 px-4 py-3 outline-none focus:border-[#FF593F]"
                            placeholder="Repeat your password"
                        />
                    </label>

                    {errorMessage && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    {successMessage && (
                        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {successMessage}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36] disabled:opacity-60"
                    >
                        {isSubmitting ? "Creating account…" : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-[#17233B]/65">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-semibold text-[#FF593F]"
                    >
                        Sign in
                    </Link>
                </p>
            </section>
        </main>
    );
}