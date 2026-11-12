import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { LoyaltyCard } from "@/components/loyalty-card";
import { cardState } from "@/lib/loyalty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";

// A loyalty card belonging to someone without an account. The address is the
// only way back to it, so it is never indexed and never guessable.
export const metadata: Metadata = {
    title: "Your loyalty card",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ joined?: string }>;
};

type GuestCard = {
    card_code: string;
    guest_name: string;
    business_name: string;
    business_slug: string;
    reward: string;
    terms: string | null;
    stamps_required: number;
    stamps: number;
    rewards_redeemed: number;
    card_colour: string | null;
    card_header: string | null;
    card_accent: string | null;
    stamp_icon: string | null;
    logo_url: string | null;
    // A card nobody can join any more: one last lap, one reward, done.
    program_closed: boolean;
    card_finished: boolean;
    // Their card on the one being handed out now. A guest has no list,
    // so this address is the only way they can be shown it.
    new_card_token: string | null;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A link that has been claimed into an account, or was never a card. The
// page streams, so notFound() here would render after the status has gone
// out; this says the same thing and offers the way forward.
function CardNotAvailable() {
    return (
        <div className="mx-auto max-w-xl px-6 py-24 text-center sm:px-10">
            <h1 className="text-3xl font-semibold tracking-tight text-[#17233B]">
                This card link isn&apos;t live
            </h1>
            <p className="mt-4 text-[#17233B]/65">
                It may have been added to a Promotello account. Sign in with the email you joined
                with and your card and stamps are there.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button render={<Link href="/login?next=/dashboard/loyalty" />} nativeButton={false} size="lg">
                    Sign in
                </Button>
                <Button
                    render={<Link href="/businesses" />}
                    nativeButton={false}
                    variant="outline"
                    size="lg"
                >
                    Find a business
                </Button>
            </div>
        </div>
    );
}

async function GuestCardView({ params, searchParams }: PageProps) {
    await connection();

    const [{ token }, { joined }] = await Promise.all([params, searchParams]);

    if (!uuid.test(token)) {
        return <CardNotAvailable />;
    }

    const supabase = await createClient();
    const { data } = await supabase
        .rpc("get_guest_loyalty_card", { requested_token: token })
        .maybeSingle<GuestCard>();

    if (!data) {
        return <CardNotAvailable />;
    }

    const origin = await requestOrigin();
    const qr = await qrSvg(`${origin}/stamp/${data.card_code}`);

    const state = cardState({
        stamps: data.stamps,
        stampsRequired: data.stamps_required,
        closed: data.program_closed,
        finished: data.card_finished,
    });

    return (
        <div className="mx-auto max-w-xl px-6 py-12 sm:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                Your loyalty card
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17233B]">
                {data.business_name}
            </h1>
            <p className="mt-2 text-[#17233B]/65">
                {state === "finished"
                    ? "This card is done: the reward on it has been claimed."
                    : "Show this when you pay and staff will scan it to add a stamp."}
            </p>

            {joined && (
                <Alert className="mt-6 border-emerald-200 bg-emerald-50 text-emerald-900">
                    <AlertTitle>You&apos;ve joined</AlertTitle>
                    <AlertDescription>
                        We&apos;ve emailed you this link as well, so you can find your card again.
                        Adding it to your home screen works too.
                    </AlertDescription>
                </Alert>
            )}

            <div className="mt-8">
                <LoyaltyCard
                    businessName={data.business_name}
                    businessHref={`/businesses/${data.business_slug}`}
                    logoUrl={data.logo_url}
                    stampsRequired={data.stamps_required}
                    reward={data.reward}
                    stamps={data.stamps}
                    rewardsRedeemed={data.rewards_redeemed}
                    terms={data.terms}
                    code={data.card_code}
                    colour={data.card_colour}
                    header={data.card_header}
                    accent={data.card_accent}
                    stampIcon={data.stamp_icon}
                    lastOne={state === "last-lap"}
                    finished={state === "finished"}
                    newCardHref={
                        data.new_card_token && state !== "collecting" && state !== "last-lap"
                            ? `/card/${data.new_card_token}`
                            : undefined
                    }
                    qr={<span className="block size-full" dangerouslySetInnerHTML={{ __html: qr }} />}
                />
            </div>

            <div className="mt-8 rounded-2xl border border-[#17233B]/10 bg-white p-6">
                <h2 className="font-semibold text-[#17233B]">Keep your stamps safe</h2>
                <p className="mt-2 text-sm leading-6 text-[#17233B]/70">
                    This card lives at this address only. Make a free Promotello account with the same
                    email and your stamps come with you, along with every other card and voucher in one
                    place.
                </p>

                <Button
                    render={<Link href="/signup?next=/dashboard/loyalty" />}
                    nativeButton={false}
                    className="mt-4"
                >
                    Create a free account
                </Button>
            </div>
        </div>
    );
}

export default function GuestCardPage(props: PageProps) {
    return (
        <main className="min-h-dvh bg-[#FFF8F0]">
            <Suspense
                fallback={
                    <div className="mx-auto max-w-xl px-6 py-12 sm:px-10">
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="mt-4 h-80 w-full rounded-2xl" />
                    </div>
                }
            >
                <GuestCardView {...props} />
            </Suspense>
        </main>
    );
}
