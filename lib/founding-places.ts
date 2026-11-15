import { cacheLife } from "next/cache";

import { FOUNDING_MEMBER_LIMIT, countFoundingMembers } from "@/lib/billing";

// How many founding places are left, for any page that wants to say so.
//
// It lived on the pricing page, which is not where the decision is made:
// a business reading its own preview is one press from claiming, and the
// scarcity belonged next to that press rather than two clicks away
// (docs/LAUNCH-FUNNEL.md).
//
// Refreshed in minutes, not hours: the last few places go quickly, and
// an hour-old count advertises places that have already gone. Checkout
// enforces the limit itself, so 51 can never be sold whatever this says.
export async function foundingPlacesLeft() {
    "use cache";
    cacheLife("minutes");

    try {
        return Math.max(FOUNDING_MEMBER_LIMIT - (await countFoundingMembers()), 0);
    } catch {
        // A count we cannot read is not worth a broken page: the caller
        // says the limit exists without claiming a number.
        return null;
    }
}
