import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiArrowLeft, FiCheckCircle, FiGift } from "react-icons/fi";

import { LoyaltyCard } from "@/components/loyalty-card";
import { cardState } from "@/lib/loyalty-state";
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
    searchParams: Promise<{ done?: string; error?: string; handed?: string; finished?: string }>;
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
    // A card nobody can join any more: it fills once, pays out once and
    // is then finished for good.
    program_closed: boolean;
    card_finished: boolean;
    // The same customer's card on the card being handed out now, where
    // they hold one, so a single scan can serve both.
    open_card_code: string | null;
    open_card_name: string | null;
    open_card_stamps: number | null;
    open_card_stamps_required: number | null;
    open_card_stamped_recently: boolean | null;
};

const errorMessages: Record<string, string> = {
    cooldown: "This card was stamped in the last 10 minutes, so this looks like a double scan.",
    "not-ready": "There aren't enough stamps for a reward yet.",
    full: "This card is full and isn't handed out any more, so it takes no more stamps. Redeem the reward.",
    finished: "This card is finished: its reward has been claimed and it was the last one.",
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

    const [{ code }, { done, error, handed, finished }] = await Promise.all([params, searchParams]);
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

    const state = cardState({
        stamps: card.stamps,
        stampsRequired: card.stamps_required,
        closed: card.program_closed,
        finished: card.card_finished,
    });
    const rewardReady = state === "reward-ready";
    const remaining = Math.max(card.stamps_required - card.stamps, 0);

    // A closed card takes no more stamps once it is full: it is being
    // seen out, not run. Their stamps go on the card the business hands
    // out now, which one press from here can reach.
    const takesStamps = state === "collecting" || state === "last-lap";
    const newCard = card.open_card_code && !takesStamps
        ? {
            code: card.open_card_code,
            name: card.open_card_name ?? "their new card",
            stamps: card.open_card_stamps ?? 0,
            stampsRequired: card.open_card_stamps_required ?? 0,
            // The new card is handed over with this visit's stamp
            // already spent on the card it replaced. Saying so beats
            // offering a button that answers "double scan".
            stampedThisVisit: card.open_card_stamped_recently === true,
        }
        : null;

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
                    lastOne={state === "last-lap"}
                    finished={state === "finished"}
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
                                    ? handed
                                        ? "The card is full. They've been given the new card, and their next stamp goes on it."
                                        : "The card is full. They can redeem their reward now or on their next visit."
                                    : `${remaining} more ${remaining === 1 ? "stamp" : "stamps"} to go.`
                                : finished
                                    ? `Give them ${card.reward.charAt(0).toLowerCase() + card.reward.slice(1)}. This card is finished.`
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

                {/* Where the card is being seen out, say so before the
                    buttons do: staff are explaining this to somebody
                    standing in front of them. */}
                {state === "finished" && (
                    <p className="mb-5 text-sm text-[#17233B]/65">
                        This card is finished — its reward has been claimed and it
                        was the last one.
                        {newCard
                            ? ` Their stamps go on ${newCard.name} now.`
                            : " There's no card on offer here at the moment."}
                    </p>
                )}

                {state === "reward-ready" && card.program_closed && (
                    <p className="mb-5 text-sm text-[#17233B]/65">
                        This card is full and isn&apos;t handed out any more, so it
                        takes no more stamps.
                        {newCard && !newCard.stampedThisVisit
                            ? ` Redeem the reward, and their stamps go on ${newCard.name}.`
                            : newCard
                                ? " Redeem the reward."
                                : " Redeem the reward and it's finished."}
                    </p>
                )}

                {newCard?.stampedThisVisit && (
                    <p className="mb-5 text-sm text-[#17233B]/65">
                        This visit&apos;s stamp is on the card that just filled, so{" "}
                        {newCard.name} takes its first one next time they&apos;re in.
                    </p>
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

                        {takesStamps && (
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
                        )}

                        {/* The customer holds the new card and is standing
                            here: one press rather than a different code. */}
                        {newCard && !newCard.stampedThisVisit && (
                            <form action={addStamp}>
                                <input type="hidden" name="code" value={newCard.code} />
                                <SubmitButton
                                    pendingLabel="Stamping…"
                                    variant={rewardReady ? "outline" : "default"}
                                    className={rewardReady ? "h-12 w-full text-base" : "h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90"}
                                >
                                    Add a stamp on {newCard.name}
                                </SubmitButton>
                            </form>
                        )}

                        {!takesStamps && !newCard && !rewardReady && (
                            <Button
                                render={<Link href={`/business/${card.business_id}/loyalty`} />}
                                nativeButton={false}
                                variant="outline"
                                className="h-12 w-full text-base"
                            >
                                Back to loyalty dashboard
                            </Button>
                        )}
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
