import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiCheckCircle, FiGift } from "react-icons/fi";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { addStamp, redeemReward } from "./actions";

export const metadata: Metadata = {
    title: "Stamp a loyalty card",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{ code: string }>;
    searchParams: Promise<{ done?: string; error?: string }>;
};

type StaffCard = {
    card_code: string;
    business_id: string;
    business_name: string;
    reward: string;
    stamps_required: number;
    stamps: number;
    rewards_redeemed: number;
    customer_name: string | null;
    is_own_card: boolean;
};

const errorMessages: Record<string, string> = {
    cooldown: "This card was stamped in the last 10 minutes, so this looks like a double scan.",
    "not-ready": "There aren't enough stamps for a reward yet.",
    "own-card": "You can't stamp or redeem your own card. Ask a colleague to do it.",
    forbidden: "This card belongs to a business you don't work at.",
    "not-found": "We couldn't find that card.",
    failed: "That didn't work. Please try again.",
};

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex min-h-dvh items-start justify-center bg-[#FFF8F0] px-5 py-10 text-[#17233B] sm:items-center">
            <div className="w-full max-w-md">{children}</div>
        </main>
    );
}

async function StampContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ code }, { done, error }] = await Promise.all([params, searchParams]);
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/stamp/${code}`)}`);
    }

    // Only returns a card if the signed-in user works at its business.
    const { data } = await supabase.rpc("staff_get_loyalty_card", { requested_code: code });
    const card = (Array.isArray(data) ? data[0] : null) as StaffCard | null;

    if (!card) {
        return (
            <Shell>
                <div className="rounded-3xl border border-[#17233B]/10 bg-white p-8 text-center">
                    <h1 className="text-2xl font-semibold">Card not found</h1>
                    <p className="mt-3 text-[#17233B]/65">
                        This loyalty card doesn&apos;t belong to a business you work at,
                        or the code is wrong. Check you&apos;re signed in with your
                        business account.
                    </p>
                    <Button render={<Link href="/business/dashboard" />} nativeButton={false} variant="outline" className="mt-6">
                        Business dashboard
                    </Button>
                </div>
            </Shell>
        );
    }

    const rewardReady = card.stamps >= card.stamps_required;
    const remaining = Math.max(card.stamps_required - card.stamps, 0);

    return (
        <Shell>
            <div className="rounded-3xl border border-[#17233B]/10 bg-white p-7 shadow-sm">
                <p className="text-sm font-medium text-[#17233B]/55">{card.business_name} loyalty card</p>
                <h1 className="mt-1 text-2xl font-semibold">
                    {card.customer_name ? `${card.customer_name}'s card` : "Customer card"}
                </h1>
                <p className="mt-1 font-mono text-sm tracking-widest text-[#17233B]/50">{card.card_code}</p>

                {done && !error && (
                    <Alert className="mt-5 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <FiCheckCircle aria-hidden="true" />
                        <AlertTitle>{done === "stamp" ? "Stamp added" : "Reward redeemed"}</AlertTitle>
                        <AlertDescription>
                            {done === "stamp"
                                ? rewardReady
                                    ? "The card is full. They can redeem their reward now or on their next visit."
                                    : `${remaining} more ${remaining === 1 ? "stamp" : "stamps"} to go.`
                                : `Give them ${card.reward.charAt(0).toLowerCase() + card.reward.slice(1)}.`}
                        </AlertDescription>
                    </Alert>
                )}

                {error && errorMessages[error] && (
                    <Alert variant="destructive" className="mt-5">
                        <AlertTitle>Not done</AlertTitle>
                        <AlertDescription>{errorMessages[error]}</AlertDescription>
                    </Alert>
                )}

                <div className="mt-6 rounded-2xl bg-[#FFF8F0] p-5">
                    <p className="text-sm font-medium">
                        {card.stamps} of {card.stamps_required} stamps · reward: {card.reward}
                    </p>
                    <div className="mt-4">
                        <LoyaltyStamps stamps={card.stamps} required={card.stamps_required} />
                    </div>
                    {card.rewards_redeemed > 0 && (
                        <p className="mt-4 text-xs text-[#17233B]/55">
                            {card.rewards_redeemed} {card.rewards_redeemed === 1 ? "reward" : "rewards"} redeemed so far
                        </p>
                    )}
                </div>

                {card.is_own_card ? (
                    <p className="mt-6 text-sm text-[#17233B]/65">
                        This is your own card. Ask a colleague to stamp it.
                    </p>
                ) : (
                    <div className="mt-6 space-y-3">
                        {rewardReady && (
                            <form action={redeemReward}>
                                <input type="hidden" name="code" value={card.card_code} />
                                <SubmitButton pendingLabel="Redeeming…" className="h-12 w-full bg-[#17233B] text-base text-white hover:bg-[#17233B]/90">
                                    <FiGift aria-hidden="true" />
                                    Redeem reward
                                </SubmitButton>
                            </form>
                        )}

                        <form action={addStamp}>
                            <input type="hidden" name="code" value={card.card_code} />
                            <SubmitButton
                                pendingLabel="Stamping…"
                                variant={rewardReady ? "outline" : "default"}
                                className={rewardReady ? "h-12 w-full text-base" : "h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90"}
                            >
                                Add a stamp
                            </SubmitButton>
                        </form>
                    </div>
                )}

                <Button
                    render={<Link href={`/business/${card.business_id}/loyalty`} />}
                    nativeButton={false}
                    variant="ghost"
                    className="mt-4 w-full"
                >
                    Back to loyalty dashboard
                </Button>
            </div>
        </Shell>
    );
}

export default function StampPage(props: PageProps) {
    return (
        <Suspense fallback={<Shell><div className="h-96 animate-pulse rounded-3xl bg-white" /></Shell>}>
            <StampContent {...props} />
        </Suspense>
    );
}
