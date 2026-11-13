import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowLeft } from "react-icons/fi";

import { EmptyState, ShowMore } from "@/components/listing-ui";
import { LoyaltyCardsLive } from "@/components/loyalty-cards-live";
import { Skeleton } from "@/components/ui/skeleton";
import { pageOf } from "@/lib/listing-filters";
import type { LoyaltyGroup } from "@/lib/loyalty-state";

import { getGroupedCards } from "./loyalty-wallet";
import { LoyaltyCardGrid, LoyaltyFilter, walletGroups } from "./wallet";

// One group of the wallet in full: Ready to claim, Collecting, or
// Finished. A screenful at a time, the way the public listings are
// paged — somebody with thirty cards should not be handed thirty.

const PER_SCREEN = 8;

type PageProps = { searchParams: Promise<{ show?: string }> };

function Loading() {
    return (
        <div className="mx-auto max-w-6xl">
            <Skeleton className="h-10 w-56 rounded-lg" />
            <div className="mt-8 grid gap-5 md:grid-cols-2">
                <Skeleton className="h-96 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        </div>
    );
}

async function Cards({ group, searchParams }: PageProps & { group: LoyaltyGroup }) {
    await connection();

    const { show } = await searchParams;
    const words = walletGroups[group];
    const { userId, origin, groups, counts } = await getGroupedCards(words.href);
    const page = pageOf(groups[group], show, PER_SCREEN);

    return (
        <div className="text-[#17233B]">
            <LoyaltyCardsLive userId={userId} />

            <div className="mx-auto max-w-6xl">
                <Link
                    href="/dashboard/loyalty"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#17233B]/70 hover:text-[#17233B]"
                >
                    <FiArrowLeft aria-hidden="true" className="size-4" />
                    All my loyalty cards
                </Link>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            {words.label} <span className="text-[#17233B]/50">({page.total})</span>
                        </h1>
                        <p className="mt-2 max-w-2xl text-[#17233B]/65">{words.description}</p>
                    </div>

                    <LoyaltyFilter active={group} counts={counts} />
                </div>

                <div className="mt-8">
                    {page.total === 0 ? (
                        <EmptyState
                            title={`No cards ${words.label.toLowerCase()}`}
                            description={words.empty}
                            href="/dashboard/loyalty"
                            linkLabel="All my loyalty cards"
                        />
                    ) : (
                        <>
                            <LoyaltyCardGrid cards={page.shown} origin={origin} />

                            <ShowMore
                                shown={page.shown.length}
                                total={page.total}
                                paged={page.paged}
                                capped={page.capped}
                                nextHref={page.more ? `${words.href}?show=${page.more}` : null}
                                noun="cards"
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function LoyaltyGroupPage({ group, ...props }: PageProps & { group: LoyaltyGroup }) {
    return (
        <Suspense fallback={<Loading />}>
            <Cards group={group} {...props} />
        </Suspense>
    );
}
