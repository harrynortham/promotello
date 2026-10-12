"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setIsSubmitting(true);
        setMessage("");
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setMessage("Check your email for a password reset link.");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
            <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm sm:p-10">
                <Link
                    href="/login"
                    className="text-sm font-semibold text-[#FF593F]"
                >
                    ← Back to sign in
                </Link>

                <h1 className="mt-8 text-3xl font-semibold tracking-tight">
                    Reset your password
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Enter your email and we’ll send you a reset link.
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

                    {errorMessage && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    {message && (
                        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36] disabled:opacity-60"
                    >
                        {isSubmitting ? "Sending link…" : "Send reset link"}
                    </button>
                </form>
            </section>
        </main>
    );
}