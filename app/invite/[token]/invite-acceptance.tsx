"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type InviteAcceptanceProps = {
    token: string;
};

export default function InviteAcceptance({
    token,
}: InviteAcceptanceProps) {
    const router = useRouter();

    const [isAccepting, setIsAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function acceptInvitation() {
        setIsAccepting(true);
        setErrorMessage("");

        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setErrorMessage(
                "Please sign in with the invited email address before accepting this invitation.",
            );
            setIsAccepting(false);
            return;
        }

        const { error } = await supabase.rpc(
            "accept_business_invitation",
            {
                requested_token: token,
            },
        );

        setIsAccepting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setAccepted(true);
    }

    if (accepted) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
                <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                        ✓
                    </div>

                    <h1 className="mt-6 text-3xl font-semibold">
                        Invitation accepted
                    </h1>

                    <p className="mt-3 leading-7 text-[#17233B]/65">
                        You have been added to the business team successfully.
                    </p>

                    <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="mt-8 rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36]"
                    >
                        Open dashboard
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    Team invitation
                </p>

                <h1 className="mt-4 text-3xl font-semibold">
                    You’ve been invited to join a business team
                </h1>

                <p className="mt-4 leading-7 text-[#17233B]/65">
                    Accept this invitation to access the business dashboard.
                </p>

                {errorMessage && (
                    <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </p>
                )}

                <button
                    type="button"
                    onClick={acceptInvitation}
                    disabled={isAccepting}
                    className="mt-8 w-full rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isAccepting ? "Accepting invitation…" : "Accept invitation"}
                </button>

                <Link
                    href="/dashboard"
                    className="mt-5 inline-block text-sm font-semibold text-[#FF593F]"
                >
                    Back to dashboard
                </Link>
            </section>
        </main>
    );
}