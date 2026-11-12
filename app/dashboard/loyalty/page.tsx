import { businessPath } from "@/lib/slugs";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/listing-ui";
import { LiveLoyaltyCard } from "@/components/live-loyalty-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";

import { getLoyaltyCards } from "./cards";

export const metadata: Metadata = {
    title: "My loyalty cards",
};

type PageProps = {
    searchParams: Promise<{ joined?: string }>;
};

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

    const { joined } = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/dashboard/loyalty");
    }

    // Cards they joined as a guest with this email become theirs here. It is
    // safe to call every time: there is usually nothing to claim.
    await supabase.rpc("claim_guest_loyalty_cards");

    const [cards, origin] = await Promise.all([getLoyaltyCards(user.id), requestOrigin()]);
    const svgs = await Promise.all(cards.map((card) => qrSvg(`${origin}/stamp/${card.code}`)));

    return (
        <div className="text-[#17233B]">
            <div className="mx-auto max-w-6xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">Your wallet</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">My loyalty cards</h1>
                <p className="mt-2 max-w-2xl text-[#17233B]/65">
                    Show your card when you pay. Staff scan the code to add a stamp.
                </p>

                {joined && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>You&apos;ve joined</AlertTitle>
                        <AlertDescription>
                            Your card is below. Tip: add this page to your home screen so it&apos;s one tap away at the till.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="mt-8">
                    {cards.length === 0 ? (
                        <EmptyState
                            title="No loyalty cards yet"
                            description="Look for the loyalty card on a business's page and join it to start collecting stamps."
                            href="/businesses"
                            linkLabel="Find businesses"
                        />
                    ) : (
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
                                        // The card's own page, where it
                                        // is the only thing on screen.
                                        href={`/loyalty/${card.programId}`}
                                        qr={<span className="block size-full" dangerouslySetInnerHTML={{ __html: svgs[index] }} />}
                                        className={joined === card.programId ? "border-[#FF593F] ring-2 ring-[#FF593F]/20" : "border-[#17233B]/10"}
                                    />
                                );
                            })}
                        </div>
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
