import { FilterDrawer } from "@/components/filter-drawer";
import { LiveLoyaltyCard } from "@/components/live-loyalty-card";
import { qrSvg } from "@/lib/qr";
import { businessPath } from "@/lib/slugs";
import type { LoyaltyGroup } from "@/lib/loyalty-state";

import type { CustomerLoyaltyCard } from "./cards";

// The customer's loyalty wallet: what each group is called, how the
// cards in it are drawn, and the filter that moves between them.
//
// Shared by the wallet itself and the three pages behind "See all", so
// a card looks and behaves the same wherever it is listed — and so the
// words for a group are written once (the vouchers wallet next door
// does the same with its statuses).

export const walletGroups: Record<
    LoyaltyGroup,
    { label: string; href: string; description: string; empty: string }
> = {
    ready: {
        label: "Ready to claim",
        href: "/dashboard/loyalty/ready",
        description: "Full cards. Show one to staff and ask for your reward.",
        empty: "Fill a card and it waits here until you claim it.",
    },
    collecting: {
        label: "Collecting",
        href: "/dashboard/loyalty/collecting",
        description: "The cards closest to a reward are first.",
        empty: "Join a card at a business and it appears here.",
    },
    finished: {
        label: "Finished",
        href: "/dashboard/loyalty/finished",
        description: "Cards you have claimed and the business no longer hands out.",
        empty: "Cards you have finished with are kept here.",
    },
};

export function LoyaltyFilter({
    active,
    counts,
}: {
    active: LoyaltyGroup | "all";
    counts: Record<LoyaltyGroup, number>;
}) {
    const options = [
        // First is the default, which the Filter button reads as nothing
        // chosen.
        { label: "All cards", href: "/dashboard/loyalty", active: active === "all" },
        ...(Object.keys(walletGroups) as LoyaltyGroup[]).map((group) => ({
            label: walletGroups[group].label,
            href: walletGroups[group].href,
            active: active === group,
            count: counts[group],
        })),
    ];

    return <FilterDrawer sections={[{ title: "Show", options }]} description="Which of your cards to show." />;
}

// The cards themselves. Server-rendered because each one carries its own
// QR code, drawn here rather than in the browser.
export async function LoyaltyCardGrid({
    cards,
    origin,
    joined,
}: {
    cards: CustomerLoyaltyCard[];
    origin: string;
    // The card they have just joined, which is worth pointing at once.
    joined?: string;
}) {
    const svgs = await Promise.all(cards.map((card) => qrSvg(`${origin}/stamp/${card.code}`)));

    return (
        <div className="grid gap-5 md:grid-cols-2">
            {cards.map((card, index) => {
                const business = card.business;

                return (
                    <LiveLoyaltyCard
                        key={card.id}
                        cardId={card.id}
                        id={card.programId}
                        businessName={business?.name ?? "Business"}
                        businessHref={business ? businessPath(business) : "/businesses"}
                        logoUrl={business?.logo_url}
                        stampsRequired={card.stampsRequired}
                        reward={card.reward}
                        stamps={card.stamps}
                        rewardsRedeemed={card.rewardsRedeemed}
                        active={card.active}
                        terms={card.terms}
                        colour={card.cardColour}
                        header={card.cardHeader}
                        accent={card.cardAccent}
                        stampIcon={card.stampIcon}
                        code={card.code}
                        lastOne={card.closed && !card.finished && !card.rewardReady}
                        finished={card.finished}
                        newCardHref={
                            card.newCardProgramId ? `/loyalty/${card.newCardProgramId}` : undefined
                        }
                        // The card's own page, where it is the only
                        // thing on screen.
                        href={`/loyalty/${card.programId}`}
                        qr={<span className="block size-full" dangerouslySetInnerHTML={{ __html: svgs[index] }} />}
                        className={joined === card.programId ? "border-[#FF593F] ring-2 ring-[#FF593F]/20" : "border-[#17233B]/10"}
                    />
                );
            })}
        </div>
    );
}
