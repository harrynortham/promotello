import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { LoyaltyCard } from "@/components/loyalty-card";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { businessHasPro } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import { lookUpLoyaltyCard } from "./actions";
import { LoyaltyHowItWorks } from "./how-it-works";
import { LoyaltyCardBuilder } from "./program-form";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ error?: string; saved?: string }>;
};

type LoyaltyCardRow = {
    id: string;
    program_id: string;
    card_code: string;
    stamps: number;
    rewards_redeemed: number;
    created_at: string;
    last_stamped_at: string | null;
};

type Program = {
    id: string;
    name: string;
    stamps_required: number;
    reward: string;
    terms: string | null;
    is_active: boolean;
    card_colour: string | null;
    stamp_icon: string | null;
};

const errorMessages: Record<string, string> = {
    invalid: "Choose between 3 and 20 stamps and describe the reward in 2 to 80 characters.",
    pro: "Loyalty cards are part of Pro. Upgrade to start a stamp card.",
    save: "We couldn't save the loyalty card. Please try again.",
    name: "You already have a card with that name. Give this one a different one.",
    code: "That doesn't look like a card code. Codes are 10 letters and numbers.",
};

function weekAgo() {
    return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

function LoadingState() {
    return (
        <div>
            <div>
                <Skeleton className="h-10 w-64 rounded-lg" />
                <Skeleton className="mt-8 h-64 rounded-xl" />
            </div>
        </div>
    );
}

async function LoyaltyContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { error, saved }] = await Promise.all([params, searchParams]);
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/business/dashboard");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        notFound();
    }

    const canManage = ["owner", "admin"].includes(membership.role);

    const [{ data: programs }, { data: business }, hasPro] = await Promise.all([
        supabase
            .from("loyalty_programs")
            .select("id, name, stamps_required, reward, terms, is_active, card_colour, stamp_icon")
            .eq("business_id", businessId)
            .order("is_active", { ascending: false })
            .order("created_at", { ascending: true }),
        supabase
            .from("businesses")
            .select("name, logo_url, slug, approval_status")
            .eq("id", businessId)
            .maybeSingle(),
        businessHasPro(supabase, businessId),
    ]);

    const cards = (programs ?? []) as Program[];
    // The first live card still leads the page: it is what the stamp box
    // and the share panel act on, and most businesses will only have one.
    const program = cards.find((card) => card.is_active) ?? cards[0] ?? null;

    let stats = { members: 0, stampsThisWeek: 0, rewards: 0 };
    let cardList: LoyaltyCardRow[] = [];

    if (cards.length > 0) {
        const { data: holders } = await supabase
            .from("loyalty_cards")
            .select("id, program_id, card_code, stamps, rewards_redeemed, created_at, last_stamped_at")
            .in("program_id", cards.map((card) => card.id))
            .order("created_at", { ascending: false });

        cardList = (holders ?? []) as LoyaltyCardRow[];

        const holderIds = cardList.map((holder) => holder.id);
        const { count } = holderIds.length
            ? await supabase
                .from("loyalty_events")
                .select("id", { count: "exact", head: true })
                .in("card_id", holderIds)
                .eq("kind", "stamp")
                .gte("created_at", weekAgo())
            : { count: 0 };

        stats = {
            members: holderIds.length,
            stampsThisWeek: count ?? 0,
            rewards: cardList.reduce((sum, holder) => sum + holder.rewards_redeemed, 0),
        };
    }

    return (
        <div className="text-[#17233B]">
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Loyalty card
                        </p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            Reward your regulars
                        </h1>
                        <p className="mt-3 max-w-2xl text-[#17233B]/65">
                            A digital stamp card customers keep on their phone.
                            Staff scan the customer&apos;s card to add a stamp,
                            so nobody can stamp their own.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                        <LoyaltyHowItWorks />
                    </div>
                </div>

                {error && errorMessages[error] && (
                    <Alert variant="destructive" className="mt-8">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>{errorMessages[error]}</AlertDescription>
                    </Alert>
                )}

                {saved && !error && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>Loyalty card saved</AlertTitle>
                        <AlertDescription>Customers can join it from your business page.</AlertDescription>
                    </Alert>
                )}

                {!program ? (
                    canManage ? (
                        <LoyaltyCardBuilder
                            businessId={businessId}
                            businessName={business?.name ?? "Your business"}
                            businessLogoUrl={business?.logo_url ?? null}
                            program={null}
                            submitLabel="Start loyalty card"
                            locked={!hasPro}
                        />
                    ) : (
                        <p className="mt-8 text-[#17233B]/65">Ask a business owner or admin to set up the loyalty card.</p>
                    )
                ) : (
                    <>
                        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                            {[
                                ["Members", stats.members],
                                ["Stamps this week", stats.stampsThisWeek],
                                ["Rewards given", stats.rewards],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-xl border border-[#17233B]/10 bg-white px-5 py-4">
                                    <dt className="text-sm text-[#17233B]/70">{label}</dt>
                                    <dd className="mt-1 text-3xl font-semibold">{value}</dd>
                                </div>
                            ))}
                        </dl>

                    </>
                )}

                {cards.length > 0 && (
                    <section className="mt-10">
                        <h2 className="text-xl font-semibold">Your loyalty cards</h2>

                        <div className="mt-4 grid gap-5 md:grid-cols-2">
                            {/* One card each for now. The database can hold
                                more and the screens can show more, so the way
                                to a second is a decision rather than a build.
                                The slot is better spent on the thing staff do
                                every day. */}
                            <Card className="border-[#17233B]/10">
                                <CardHeader>
                                    <CardTitle>Stamp a card</CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <p className="text-sm leading-6 text-[#17233B]/65">
                                        Scan the QR code on the customer&apos;s card with
                                        your phone camera, or type the code shown under
                                        it.
                                    </p>

                                    <form action={lookUpLoyaltyCard} className="mt-5 flex gap-2">
                                        <input type="hidden" name="businessId" value={businessId} />
                                        <Input
                                            name="code"
                                            required
                                            placeholder="e.g. 4F8A2C91D0"
                                            aria-label="Card code"
                                            className="font-mono uppercase"
                                            autoComplete="off"
                                        />
                                        <SubmitButton size="lg" pendingLabel="Finding…">
                                            Find card
                                        </SubmitButton>
                                    </form>
                                </CardContent>
                            </Card>

                            {cards.map((card) => {
                                const holders = cardList.filter((holder) => holder.program_id === card.id);

                                return (
                                    <div key={card.id} className="flex flex-col">
                                        <LoyaltyCard
                                            businessName={business?.name ?? "Your business"}
                                            logoUrl={business?.logo_url}
                                            stampsRequired={card.stamps_required}
                                            reward={card.reward}
                                            stamps={Math.min(3, card.stamps_required - 1)}
                                            terms={card.terms}
                                            code={card.id.slice(0, 10).toUpperCase()}
                                            qr={null}
                                            colour={card.card_colour}
                                            stampIcon={card.stamp_icon}
                                            active={card.is_active}
                                            className="border-[#17233B]/10"
                                        />

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <p className="mr-auto text-sm font-medium">
                                                {card.name}
                                                <span className="ml-2 text-xs font-normal text-[#17233B]/65">
                                                    {card.is_active ? "Live" : "Paused"} · {holders.length}{" "}
                                                    {holders.length === 1 ? "member" : "members"}
                                                </span>
                                            </p>

                                            {canManage && (
                                                <Button
                                                    render={<Link href={`/business/${businessId}/loyalty/${card.id}/edit`} />}
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Edit card
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {cardList.length > 0 && (
                    <Card className="mt-6 border-[#17233B]/10">
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <CardTitle>Loyalty cards</CardTitle>

                                <p className="text-sm text-[#17233B]/65">
                                    {cardList.length} {cardList.length === 1 ? "card" : "cards"}
                                </p>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <ul className="divide-y divide-[#17233B]/10">
                                {cardList.map((card) => {
                                    const complete = card.stamps >= (program?.stamps_required ?? 0);

                                    return (
                                        <li
                                            key={card.id}
                                            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
                                        >
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="font-mono text-sm font-semibold tracking-[0.15em]">
                                                    {card.card_code}
                                                </span>

                                                {complete && (
                                                    <span className="rounded-full bg-[#FF593F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#FF593F]">
                                                        Reward ready
                                                    </span>
                                                )}

                                                {card.rewards_redeemed > 0 && (
                                                    <span className="text-xs text-[#17233B]/65">
                                                        {card.rewards_redeemed} redeemed
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#17233B]/65">
                                                <span className="font-medium text-[#17233B]">
                                                    {card.stamps} of {program?.stamps_required} stamps
                                                </span>

                                                <span className="text-xs">
                                                    Joined {new Date(card.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function LoyaltyPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <LoyaltyContent {...props} />
        </Suspense>
    );
}
