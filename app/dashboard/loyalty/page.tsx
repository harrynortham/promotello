import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { EmptyState, ShowMore } from "@/components/listing-ui";
import { LoyaltyCardsLive } from "@/components/loyalty-cards-live";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { pageOf } from "@/lib/listing-filters";
import { sortCards } from "@/lib/loyalty-state";

import { getGroupedCards } from "./loyalty-wallet";
import { LoyaltyCardGrid, LoyaltyFilter } from "./wallet";

export const metadata: Metadata = {
    title: "My loyalty cards",
};

type PageProps = {
    searchParams: Promise<{ joined?: string; show?: string }>;
};

// A screenful at a time: somebody with thirty cards should not be
// handed thirty, and pressing for more keeps their place.
const PER_SCREEN = 8;

function LoadingState() {
    return (
        <div>
            <div className="mx-auto max-w-6xl">
                <Skeleton className="h-10 w-64 rounded-lg" />
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <Skeleton className="h-96 rounded-xl" />
                    <Skeleton className="h-96 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

async function LoyaltyCardsContent({ searchParams }: PageProps) {
    await connection();

    const { joined, show } = await searchParams;
    const { userId, origin, total, cards, counts } = await getGroupedCards("/dashboard/loyalty");

    // One list, in the order somebody would put them in themselves: the
    // rewards they can claim, then the cards closest to one, then the
    // ones they can no longer collect on.
    const page = pageOf(sortCards(cards), show, PER_SCREEN);

    return (
        <div className="text-[#17233B]">
            {/* A card arriving, or one finishing: both change the list
                rather than a card in it. */}
            <LoyaltyCardsLive userId={userId} />

            <div className="mx-auto max-w-6xl">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">Your wallet</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">My loyalty cards</h1>
                        <p className="mt-2 max-w-2xl text-[#17233B]/65">
                            Show your card when you pay. Staff scan the code to add a stamp.
                            Rewards you can claim are first.
                        </p>
                    </div>

                    {total > 0 && <LoyaltyFilter active="all" counts={counts} />}
                </div>

                {joined && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>You&apos;ve joined</AlertTitle>
                        <AlertDescription>
                            Your card is below. Tip: add this page to your home screen so it&apos;s one tap away at the till.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="mt-8">
                    {total === 0 ? (
                        <EmptyState
                            title="No loyalty cards yet"
                            description="Look for the loyalty card on a business's page and join it to start collecting stamps."
                            href="/businesses"
                            linkLabel="Find businesses"
                        />
                    ) : (
                        <>
                            <LoyaltyCardGrid cards={page.shown} origin={origin} joined={joined} />

                            <ShowMore
                                shown={page.shown.length}
                                total={page.total}
                                paged={page.paged}
                                capped={page.capped}
                                nextHref={page.more ? `/dashboard/loyalty?show=${page.more}` : null}
                                noun="cards"
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LoyaltyCardsPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <LoyaltyCardsContent {...props} />
        </Suspense>
    );
}
