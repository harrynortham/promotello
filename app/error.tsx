"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorPageProps = {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
};

export default function ErrorPage({
    error,
    reset,
}: ErrorPageProps) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    Something went wrong
                </p>

                <h1 className="mt-4 text-3xl font-semibold">
                    We couldn’t complete that request
                </h1>

                <p className="mt-3 leading-7 text-[#17233B]/65">
                    Please try again. If the problem continues, return to the homepage.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={reset}
                        className="rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36]"
                    >
                        Try again
                    </button>

                    <Link
                        href="/"
                        className="rounded-xl border border-[#17233B]/15 px-6 py-3 font-semibold transition hover:bg-[#17233B]/5"
                    >
                        Return home
                    </Link>
                </div>
            </section>
        </main>
    );
}