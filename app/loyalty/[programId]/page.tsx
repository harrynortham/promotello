import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiArrowRight } from "react-icons/fi";

import { AppFooter } from "@/components/site/footers";
import { CustomerAppHeader } from "@/components/site/headers";
import { LoyaltyCard } from "@/components/loyalty-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoyaltyCards } from "@/app/dashboard/loyalty/cards";
import { qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { businessPath } from "@/lib/slugs";
import { createClient } from "@/utils/supabase/server";

// One card, on its own.
//
// Somebody who has just scanned a poster in a shop is standing at a
// counter with a phone in their hand, and the card is the only thing
// they want: not a list of the others, not a nudge about their
// birthday, not a page they have to scroll. So this is outside the
// customer dashboard's shell — the header and the footer, and the card
// in the first screenful.

export const metadata: Metadata = {
    title: "Your loyalty card",
    robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ programId: string }> };

function CardLoading() {
    return (
        <div role="status" aria-label="Loading your card" className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-[30rem] rounded-xl" />
        </div>
    );
}

async function Card({ params }: PageProps) {
    await connection();

    const { programId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/loyalty/${programId}`)}`);
    }

    // A card joined as a guest with this email becomes theirs here, the
    // same as on the list: somebody can arrive at either first.
    await supabase.rpc("claim_guest_loyalty_cards");

    const cards = await getLoyaltyCards(user.id);
    const card = cards.find((held) => held.programId === programId);

    // Not theirs, or not a card at all. The business's page is where it
    // is offered, and the list is where the rest of theirs are.
    if (!card) {
        notFound();
    }

    const origin = await requestOrigin();
    const qr = await qrSvg(`${origin}/stamp/${card.code}`);
    const business = card.business;

    return (
        <>
            {/* The card is the first thing under the header and the
                words come after it: on a small phone anything above it
                pushes the code off the bottom of the screen, and the
                code is what somebody at a counter is holding the phone
                out to show. */}
            <h1 className="sr-only">
                Your loyalty card at {business?.name ?? "this business"}
            </h1>

            <div>
                <LoyaltyCard
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
                    qr={<span className="block size-full" dangerouslySetInnerHTML={{ __html: qr }} />}
                    // A shade smaller than the list's, so the whole
                    // card lands inside the shortest phone's screen.
                    qrSize="size-44 sm:size-32"
                    className="border-[#17233B]/10"
                />
            </div>

            <p className="mt-5 text-sm leading-6 text-[#17233B]/70">
                Show this when you pay and staff scan the code to add a stamp.
                Add the page to your home screen and it is one tap away at the
                till.
            </p>

            <Link
                href="/dashboard/loyalty"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#FF593F] underline-offset-4 hover:underline"
            >
                All my loyalty cards
                <FiArrowRight aria-hidden="true" className="size-4" />
            </Link>
        </>
    );
}

export default function LoyaltyCardPage(props: PageProps) {
    return (
        <div className="flex min-h-dvh flex-col bg-[#FFF8F0] text-[#17233B]">
            <CustomerAppHeader />

            <div className="flex-1 px-6 py-4 sm:px-10 sm:py-8">
                <div className="mx-auto max-w-lg">
                    <Suspense fallback={<CardLoading />}>
                        <Card {...props} />
                    </Suspense>
                </div>
            </div>

            <AppFooter variant="customer" />
        </div>
    );
}
