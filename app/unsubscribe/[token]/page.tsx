import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FiCheckCircle } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnsubscribeToken } from "@/lib/unsubscribe";
import { createPublicClient } from "@/utils/supabase/public";
import { unsubscribe } from "./actions";

export const metadata: Metadata = {
    title: "Email preferences",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ done?: string; error?: string }>;
};

type Follower = {
    business_id: string;
    business_name: string;
    emails_enabled: boolean;
    all_emails_enabled: boolean;
};

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex min-h-dvh items-start justify-center bg-[#FFF8F0] px-5 py-10 text-[#17233B] sm:items-center">
            <div className="w-full max-w-md rounded-3xl border border-[#17233B]/10 bg-white p-8">{children}</div>
        </main>
    );
}

async function UnsubscribeContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ token }, { done, error }] = await Promise.all([params, searchParams]);

    const { data } = isUnsubscribeToken(token)
        ? await createPublicClient().rpc("follower_by_unsubscribe_token", { requested_token: token })
        : { data: null };
    const follower = (Array.isArray(data) ? data[0] : null) as Follower | null;

    if (!follower) {
        return (
            <Shell>
                <h1 className="text-2xl font-semibold">Link not recognised</h1>
                <p className="mt-3 text-[#17233B]/65">
                    This unsubscribe link has expired, perhaps because you unfollowed
                    the business. You can manage every email from your account.
                </p>
                <Button render={<Link href="/account/notifications" />} nativeButton={false} variant="outline" className="mt-6">
                    Email settings
                </Button>
            </Shell>
        );
    }

    const stoppedAll = !follower.all_emails_enabled;
    const stoppedBusiness = !follower.emails_enabled;

    return (
        <Shell>
            {done ? (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <FiCheckCircle aria-hidden="true" />
                    <AlertTitle>You&apos;re unsubscribed</AlertTitle>
                    <AlertDescription>
                        {done === "all"
                            ? "You won't get new-offer emails from any business."
                            : `You won't get new-offer emails from ${follower.business_name}.`}
                    </AlertDescription>
                </Alert>
            ) : (
                <>
                    <p className="text-sm font-medium text-[#17233B]/70">Email preferences</p>
                    <h1 className="mt-1 text-2xl font-semibold leading-tight">
                        {stoppedBusiness
                            ? `You're not getting emails from ${follower.business_name}`
                            : `Stop emails from ${follower.business_name}?`}
                    </h1>
                    <p className="mt-3 text-[#17233B]/65">
                        You&apos;ll stay a follower and can still see their offers on Promotello.
                    </p>
                </>
            )}

            {error && (
                <Alert variant="destructive" className="mt-5">
                    <AlertTitle>That didn&apos;t work</AlertTitle>
                    <AlertDescription>Please try again.</AlertDescription>
                </Alert>
            )}

            <form action={unsubscribe} className="mt-6 space-y-3">
                <input type="hidden" name="token" value={token} />

                {!stoppedBusiness && (
                    <SubmitButton className="w-full" pendingLabel="Unsubscribing…">
                        Unsubscribe from {follower.business_name}
                    </SubmitButton>
                )}

                {!stoppedAll && (
                    <SubmitButton
                        name="everything"
                        value="1"
                        variant="outline"
                        className="w-full"
                        pendingLabel="Unsubscribing…"
                    >
                        Stop emails from all businesses
                    </SubmitButton>
                )}
            </form>

            <p className="mt-6 text-sm text-[#17233B]/70">
                Changed your mind? Turn emails back on in{" "}
                <Link href="/account/notifications" className="font-medium text-[#FF593F] hover:underline">
                    your email settings
                </Link>
                .
            </p>
        </Shell>
    );
}

export default function UnsubscribePage(props: PageProps) {
    return (
        <Suspense
            fallback={
                <Shell>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="mt-4 h-16 w-full" />
                </Shell>
            }
        >
            <UnsubscribeContent {...props} />
        </Suspense>
    );
}
