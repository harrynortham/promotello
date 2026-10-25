import { businessPath } from "@/lib/slugs";
import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiGift } from "react-icons/fi";

import { EmptyState } from "@/components/listing-ui";
import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
    title: "My loyalty cards",
};

type PageProps = {
    searchParams: Promise<{ joined?: string }>;
};

type CardRow = {
    id: string;
    card_code: string;
    stamps: number;
    rewards_redeemed: number;
    loyalty_programs: {
        id: string;
        stamps_required: number;
        reward: string;
        is_active: boolean;
        businesses: { id: string; slug: string; name: string; logo_url: string | null } | { id: string; slug: string; name: string; logo_url: string | null }[] | null;
    } | null;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 sm:px-10">
            <div className="mx-auto max-w-5xl">
                <Skeleton className="h-10 w-64 rounded-md" />
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <Skeleton className="h-96 rounded-3xl" />
                    <Skeleton className="h-96 rounded-3xl" />
                </div>
            </div>
        </main>
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

    const [{ data }, origin] = await Promise.all([
        supabase
            .from("loyalty_cards")
            .select(
                `
                    id, card_code, stamps, rewards_redeemed,
                    loyalty_programs ( id, stamps_required, reward, is_active, businesses ( id, slug, name, logo_url ) )
                `,
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        requestOrigin(),
    ]);

    const cards = ((data ?? []) as unknown as CardRow[]).filter((card) => card.loyalty_programs);
    const svgs = await Promise.all(cards.map((card) => qrSvg(`${origin}/stamp/${card.card_code}`)));

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:px-10 sm:py-14">
            <div className="mx-auto max-w-5xl">
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
                                const program = card.loyalty_programs!;
                                const business = Array.isArray(program.businesses) ? program.businesses[0] : program.businesses;
                                const rewardReady = card.stamps >= program.stamps_required;

                                return (
                                    <article
                                        key={card.id}
                                        id={program.id}
                                        className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${joined === program.id ? "border-[#FF593F] ring-2 ring-[#FF593F]/20" : "border-[#17233B]/10"}`}
                                    >
                                        <div className="flex items-center gap-3 bg-[#17233B] px-6 py-4 text-white">
                                            {business?.logo_url && (
                                                <Image src={business.logo_url} alt="" width={40} height={40} className="size-10 rounded-xl object-cover" />
                                            )}
                                            <div className="min-w-0">
                                                <Link href={business ? businessPath(business) : "/businesses"} className="block truncate font-semibold hover:underline">
                                                    {business?.name}
                                                </Link>
                                                <p className="text-sm text-white/70">
                                                    {program.stamps_required} stamps for {program.reward.charAt(0).toLowerCase() + program.reward.slice(1)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            {rewardReady && (
                                                <p className="mb-4 flex items-center gap-2 rounded-xl bg-[#FF593F]/10 px-3 py-2 text-sm font-semibold text-[#FF593F]">
                                                    <FiGift aria-hidden="true" />
                                                    Reward ready: ask staff to redeem it
                                                </p>
                                            )}

                                            <LoyaltyStamps stamps={card.stamps} required={program.stamps_required} />

                                            <p className="mt-3 text-sm text-[#17233B]/70">
                                                {card.stamps} of {program.stamps_required} stamps
                                                {card.rewards_redeemed > 0 && ` · ${card.rewards_redeemed} redeemed`}
                                                {!program.is_active && " · paused by the business"}
                                            </p>

                                            <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl bg-[#FFF8F0] p-5 text-center sm:flex-row sm:gap-5 sm:p-4 sm:text-left">
                                                <div
                                                    className="size-52 shrink-0 rounded-xl bg-white p-2 sm:size-32 [&>svg]:h-full [&>svg]:w-full"
                                                    dangerouslySetInnerHTML={{ __html: svgs[index] }}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium">Show this to staff</p>
                                                    <p className="mt-2 font-mono text-lg font-semibold tracking-[0.2em]">{card.card_code}</p>
                                                    <p className="mt-1 text-xs text-[#17233B]/70">They can scan it or type the code.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function LoyaltyCardsPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <LoyaltyCardsContent {...props} />
        </Suspense>
    );
}
