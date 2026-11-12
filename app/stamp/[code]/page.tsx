import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiArrowLeft, FiCheckCircle, FiGift } from "react-icons/fi";

import { LoyaltyCard } from "@/components/loyalty-card";
import { AppFooter } from "@/components/site/footers";
import { BusinessAppHeader } from "@/components/site/headers";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
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
    program_id: string;
    business_id: string;
    business_name: string;
    business_logo_url: string | null;
    reward: string;
    stamps_required: number;
    stamps: number;
    rewards_redeemed: number;
    terms: string | null;
    card_colour: string | null;
    card_header: string | null;
    card_accent: string | null;
    stamp_icon: string | null;
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

// The business's own header and footer: whoever is holding this phone
// works here, and a page with neither looks like it belongs to the
// customer whose card is on it.
function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-[#FFF8F0] text-[#17233B]">
            <BusinessAppHeader />

            <main className="flex-1 px-5 py-6 sm:py-10">
                <div className="mx-auto w-full max-w-md">{children}</div>
            </main>

            <AppFooter variant="business" />
        </div>
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

    // The card as it is on the customer's phone, including the code
    // they just held out: staff and customer looking at one thing.
    const origin = await requestOrigin();
    const qr = await qrSvg(`${origin}/stamp/${card.card_code}`);

    return (
        <Shell>
            {/* The card says whose shop it is and the customer is
                standing there, so the heading said nothing twice. The
                way back goes where it was. */}
            <Button
                render={<Link href={`/business/${card.business_id}/loyalty`} />}
                nativeButton={false}
                variant="ghost"
                size="sm"
                className="-ml-2"
            >
                <FiArrowLeft aria-hidden="true" />
                Back to loyalty dashboard
            </Button>

            <h1 className="sr-only">
                {card.customer_name
                    ? `${card.customer_name}'s loyalty card at ${card.business_name}`
                    : `A loyalty card at ${card.business_name}`}
            </h1>

            <div className="mt-3">
                <LoyaltyCard
                    businessName={card.business_name}
                    logoUrl={card.business_logo_url}
                    stampsRequired={card.stamps_required}
                    reward={card.reward}
                    stamps={card.stamps}
                    rewardsRedeemed={card.rewards_redeemed}
                    terms={card.terms}
                    colour={card.card_colour}
                    header={card.card_header}
                    accent={card.card_accent}
                    stampIcon={card.stamp_icon}
                    code={card.card_code}
                    qr={<span className="block size-full" dangerouslySetInnerHTML={{ __html: qr }} />}
                    scanTitle="Their code"
                    scanHint="The one they showed you."
                    qrSize="size-28"
                    className="border-[#17233B]/10"
                />
            </div>

            <div className="mt-5 rounded-3xl border border-[#17233B]/10 bg-white p-6 shadow-sm">

                {done && !error && (
                    <Alert className="mb-5 border-emerald-200 bg-emerald-50 text-emerald-900">
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
                    <Alert variant="destructive" className="mb-5">
                        <AlertTitle>Not done</AlertTitle>
                        <AlertDescription>{errorMessages[error]}</AlertDescription>
                    </Alert>
                )}

                {card.is_own_card ? (
                    <p className="text-sm text-[#17233B]/65">
                        This is your own card. Ask a colleague to stamp it.
                    </p>
                ) : (
                    <div className="space-y-3">
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
