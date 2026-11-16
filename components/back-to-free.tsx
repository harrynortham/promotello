import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { plans } from "@/lib/billing";
import type { WhatIsPaused } from "@/lib/what-is-paused";

// A business that had a plan and no longer does.
//
// The day it ended it got an email and a notice saying what stops
// (lib/plan-ending.ts). After that the product went quiet again, and
// the dashboard it opens every day said nothing at all — while its
// offers sat off the directory and its followers heard nothing.
//
// The argument is its own numbers, not ours. The strongest of them is
// the stamp card: enforce_loyalty_plan lets a business on Free keep
// stamping the cards people already hold, and never start another one.
// So the people holding a card are both the thing it would lose by
// walking away and the thing it cannot grow without coming back.

// Only what is actually paused. A stamp card already running keeps
// running on Free and new customers can still join it, so the people
// holding one are a reassurance rather than a loss — said separately,
// below, and never counted here.
function countLine({ pausedOffers, followers }: WhatIsPaused) {
    const parts: string[] = [];

    if (pausedOffers > 0) {
        parts.push(
            pausedOffers === 1
                ? "1 offer is off the directory"
                : `${pausedOffers} offers are off the directory`,
        );
    }

    if (followers > 0) {
        parts.push(
            followers === 1
                ? "1 follower isn't hearing about new ones"
                : `${followers} followers aren't hearing about new ones`,
        );
    }

    return parts;
}

export function BackToFree({
    businessId,
    standing,
}: {
    businessId: string;
    standing: WhatIsPaused;
}) {
    const counts = countLine(standing);

    return (
        <Alert className="border-[#17233B]/15 bg-white">
            <AlertTitle>
                {counts.length > 0
                    ? `${plans.pro_monthly.name} is off, and some of your page is paused`
                    : `${plans.pro_monthly.name} is off`}
            </AlertTitle>

            <AlertDescription>
                {counts.length > 0 ? (
                    <p>{counts.join(", and ")}.</p>
                ) : (
                    <p>
                        Your page is still up and free for as long as you like — Pro is
                        what puts more than one offer on the directory and emails your
                        followers when you post one.
                    </p>
                )}

                {standing.cardHolders > 0 && (
                    <p className="mt-2">
                        {standing.cardHolders === 1
                            ? "The person holding your stamp card keeps"
                            : `The ${standing.cardHolders} people holding your stamp card keep`}{" "}
                        every stamp, and your staff keep adding to them. Nobody new can join
                        it on Free, so your card poster has nothing to offer a passer-by.
                    </p>
                )}

                <p className="mt-2">
                    Everything paused comes back the moment you&apos;re back on Pro, exactly
                    as it was. Nothing has been deleted.
                </p>

                <p className="mt-3">
                    <Link
                        href={`/business/${businessId}/billing`}
                        className="font-medium underline underline-offset-4"
                    >
                        See the plans
                    </Link>
                </p>
            </AlertDescription>
        </Alert>
    );
}
