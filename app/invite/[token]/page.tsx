import { Suspense } from "react";
import { connection } from "next/server";
import InviteAcceptance from "./invite-acceptance";

type PageProps = {
    params: Promise<{
        token: string;
    }>;
};

function LoadingState() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <div className="h-72 w-full max-w-lg animate-pulse rounded-3xl bg-white" />
        </main>
    );
}

async function InviteContent({ params }: PageProps) {
    await connection();

    const { token } = await params;

    return <InviteAcceptance token={token} />;
}

export default function InvitePage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <InviteContent params={params} />
        </Suspense>
    );
}