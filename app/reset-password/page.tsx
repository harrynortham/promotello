"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setErrorMessage("");

        if (password.length < 8) {
            setErrorMessage("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);

        const supabase = createClient();

        const { error } = await supabase.auth.updateUser({
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
                <h1 className="text-3xl font-semibold tracking-tight">
                    Choose a new password
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Your new password must be at least 8 characters.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <label className="block text-sm font-medium">
                        New password
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#17233B]/15 px-4 py-3 outline-none focus:border-[#FF593F]"
                        />
                    </label>

                    <label className="block text-sm font-medium">
                        Confirm password
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(event) =>
                                setConfirmPassword(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-[#17233B]/15 px-4 py-3 outline-none focus:border-[#FF593F]"
                        />
                    </label>

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
                        {isSubmitting ? "Updating password…" : "Update password"}
                    </button>
                </form>

                <Link
                    href="/login"
                    className="mt-6 block text-center text-sm font-semibold text-[#FF593F]"
                >
                    Back to sign in
                </Link>
            </section>
        </main>
    );
}