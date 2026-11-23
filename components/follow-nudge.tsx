import { FollowButton } from "@/components/follow-button";

// Asked where somebody has just shown they want to come back: on a
// loyalty card they have joined, or are holding out to be stamped.
//
// Not gated to Growth. A follower is worth having on every plan --
// announcements of a new offer go to followers whatever the business
// pays (lib/new-offer-email.ts) -- and a Growth business gets its
// automations out of the same list, so gating the ask would cost the
// other two plans reach and gain Growth nothing.
//
// Nothing is shown to somebody who already follows, which is most of
// the people who will see this page twice.
export function FollowNudge({
    businessId,
    businessName,
    reason,
}: {
    businessId: string;
    businessName: string;
    // Why it is worth it, in this moment's own words.
    reason: string;
}) {
    return (
        <div className="mt-6 rounded-2xl border border-[#17233B]/10 bg-[#FFF8F0] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
                <p className="font-medium text-[#17233B]">Hear from {businessName}</p>
                <p className="mt-1 text-sm leading-6 text-[#17233B]/70">{reason}</p>
            </div>

            <div className="mt-3 shrink-0 sm:mt-0">
                <FollowButton businessId={businessId} initialFollowing={false} isSignedIn size="sm" />
            </div>
        </div>
    );
}
