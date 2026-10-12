"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setIsSubmitting(true);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        router.replace("/dashboard");
        router.refresh();
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
                    Welcome back
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Sign in to manage your businesses and promotions.
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
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#17233B]/15 px-4 py-3 outline-none focus:border-[#FF593F]"
                            placeholder="Your password"
                        />
                    </label>
                    <div className="text-right">
                        <Link
                            href="/forgot-password"
                            className="text-sm font-semibold text-[#FF593F]"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {errorMessage && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36] disabled:opacity-60"
                    >
                        {isSubmitting ? "Signing in…" : "Sign in"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-[#17233B]/65">
                    Don’t have an account?{" "}
                    <Link
                        href="/signup"
                        className="font-semibold text-[#FF593F]"
                    >
                        Create one
                    </Link>
                </p>
            </section>
        </main>
    );
}