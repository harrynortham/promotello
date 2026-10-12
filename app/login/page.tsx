"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setMessage("");

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setIsLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage("Check your email for a sign-in link.");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
                <Link
                    href="/"
                    className="text-sm font-medium text-[#17233B]/60 hover:text-[#17233B]"
                >
                    ← Back to deals
                </Link>

                <h1 className="mt-8 text-3xl font-semibold tracking-tight text-[#17233B]">
                    Sign in to Promotello
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Enter your email and we’ll send you a secure sign-in link.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="h-12 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 text-[#17233B] outline-none focus:border-[#FF593F]"
                    />

                    <Button
                        type="submit"
                        disabled={isLoading}
                        size="lg"
                        className="w-full rounded-full bg-[#FF593F] text-[#17233B] hover:bg-[#e94d36]"
                    >
                        {isLoading ? "Sending link..." : "Send sign-in link"}
                    </Button>
                </form>

                {message && (
                    <p className="mt-5 text-sm text-[#17233B]/70">{message}</p>
                )}
            </section>
        </main>
    );
}