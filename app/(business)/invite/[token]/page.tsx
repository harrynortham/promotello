import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import InviteAcceptance from "./invite-acceptance";

export const metadata: Metadata = {
    title: "Invitation",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{
        token: string;
    }>;
};

type Preview = {
    business_id: string;
    business_name: string;
    email: string;
    role: "owner" | "admin" | "member";
    hand_over: boolean;
    status: "pending" | "accepted" | "expired";
};

function Shell({ children }: { children: ReactNode }) {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-[#FFF8F0] px-6 py-10 text-[#17233B]">
            <section className="w-full max-w-lg rounded-3xl border border-[#17233B]/10 bg-white p-8 text-center shadow-sm sm:p-10">
                {children}
            </section>
        </main>
    );
}

function LoadingState() {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-[#FFF8F0] px-6">
            <div className="h-72 w-full max-w-lg animate-pulse rounded-3xl bg-white" />
        </main>
    );
}

async function InviteContent({ params }: PageProps) {
    await connection();

    const { token } = await params;
    const supabase = await createClient();

    const [{ data }, { data: { user } }] = await Promise.all([
        supabase.rpc("business_invitation_preview", { requested_token: token }),
        supabase.auth.getUser(),
    ]);

    const invitation = (Array.isArray(data) ? data[0] : null) as Preview | null;

    if (!invitation || invitation.status !== "pending") {
        return (
            <Shell>
                <h1 className="text-2xl font-semibold">
                    {invitation?.status === "accepted" ? "Invitation already accepted" : "Invitation not available"}
                </h1>
                <p className="mt-3 leading-7 text-[#17233B]/65">
                    {invitation?.status === "accepted"
                        ? "This invitation has been used. Sign in to open the business dashboard."
                        : "This link has expired or been cancelled. Ask the person who sent it for a new one."}
                </p>
                <Button render={<Link href="/business/dashboard" />} nativeButton={false} className="mt-6">
                    Business dashboard
                </Button>
            </Shell>
        );
    }

    const next = encodeURIComponent(`/invite/${token}`);
    const email = encodeURIComponent(invitation.email);
    const roleText = invitation.hand_over
        ? "the owner"
        : invitation.role === "admin"
            ? "an admin"
            : "a team member";

    return (
        <Shell>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                {invitation.hand_over ? "Your business is ready" : "Team invitation"}
            </p>

            <h1 className="mt-4 text-3xl font-semibold leading-tight">
                {invitation.hand_over
                    ? `Take over ${invitation.business_name}`
                    : `Join ${invitation.business_name}`}
            </h1>

            <p className="mt-4 leading-7 text-[#17233B]/65">
                {invitation.hand_over
                    ? `${invitation.business_name} has been set up on Promotello for you. Accept to become its owner.`
                    : `You've been invited to join ${invitation.business_name} as ${roleText}.`}
            </p>

            {!user ? (
                <>
                    <p className="mt-4 text-sm text-[#17233B]/65">
                        Use <strong className="text-[#17233B]">{invitation.email}</strong> to continue.
                    </p>
                    <div className="mt-8 grid gap-3">
                        <Button render={<Link href={`/signup?next=${next}&email=${email}`} />} nativeButton={false}>
                            Create an account
                        </Button>
                        <Button
                            render={<Link href={`/login?next=${next}&email=${email}`} />}
                            nativeButton={false}
                            variant="outline"
                        >
                            I already have an account
                        </Button>
                    </div>
                </>
            ) : user.email?.toLowerCase() !== invitation.email.toLowerCase() ? (
                <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    This invitation is for <strong>{invitation.email}</strong>, but you&apos;re signed in as{" "}
                    <strong>{user.email}</strong>. Sign out and sign in with the invited address to accept.
                </p>
            ) : (
                <InviteAcceptance
                    token={token}
                    businessId={invitation.business_id}
                    label={invitation.hand_over ? "Become the owner" : "Accept invitation"}
                />
            )}
        </Shell>
    );
}

export default function InvitePage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <InviteContent params={params} />
        </Suspense>
    );
}
