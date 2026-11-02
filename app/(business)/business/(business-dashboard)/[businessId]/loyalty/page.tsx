import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { businessHasPro } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import { lookUpLoyaltyCard, setLoyaltyProgramActive } from "./actions";
import { SharePanel } from "@/components/share-panel";
import { loyaltyShareCaption, shareLink } from "@/lib/share";
import { CardDesign } from "./card-design";
import { LoyaltyHowItWorks } from "./how-it-works";
import { LoyaltyCardBuilder, ProgramSettingsForm } from "./program-form";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ error?: string; saved?: string }>;
};

type LoyaltyCardRow = {
    id: string;
    card_code: string;
    stamps: number;
    rewards_redeemed: number;
    created_at: string;
    last_stamped_at: string | null;
};

type Program = {
    id: string;
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
            .select("id, stamps_required, reward, terms, is_active, card_colour, stamp_icon")
            .eq("business_id", businessId)
            .order("is_active", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1),
        supabase
            .from("businesses")
            .select("name, logo_url, slug, approval_status")
            .eq("id", businessId)
            .maybeSingle(),
        businessHasPro(supabase, businessId),
    ]);

    const program = (programs?.[0] ?? null) as Program | null;

    let stats = { members: 0, stampsThisWeek: 0, rewards: 0 };
    let cardList: LoyaltyCardRow[] = [];

    if (program) {
        const { data: cards } = await supabase
            .from("loyalty_cards")
            .select("id, card_code, stamps, rewards_redeemed, created_at, last_stamped_at")
            .eq("program_id", program.id)
            .order("created_at", { ascending: false });

        cardList = (cards ?? []) as LoyaltyCardRow[];

        const cardIds = (cards ?? []).map((card) => card.id);
        const { count } = cardIds.length
            ? await supabase
                .from("loyalty_events")
                .select("id", { count: "exact", head: true })
                .in("card_id", cardIds)
                .eq("kind", "stamp")
                .gte("created_at", weekAgo())
            : { count: 0 };

        stats = {
            members: cardIds.length,
            stampsThisWeek: count ?? 0,
            rewards: (cards ?? []).reduce((sum, card) => sum + card.rewards_redeemed, 0),
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
                        {program && canManage && (
                            <CardDesign
                                businessId={businessId}
                                programId={program.id}
                                businessName={business?.name ?? "Your business"}
                                businessLogoUrl={business?.logo_url ?? null}
                                stampsRequired={program.stamps_required}
                                reward={program.reward}
                                terms={program.terms}
                                colour={program.card_colour}
                                stampIcon={program.stamp_icon}
                            />
                        )}

                        {program?.is_active && business?.slug && business.approval_status === "approved" && (
                            <SharePanel
                                title="Share your loyalty card"
                                url={shareLink(`/businesses/${business.slug}`)}
                                caption={loyaltyShareCaption({
                                    stampsRequired: program.stamps_required,
                                    reward: program.reward,
                                    businessName: business.name ?? "us",
                                })}
                                images={[
                                    {
                                        label: "Instagram story",
                                        href: `/businesses/${business.slug}/story-image`,
                                        filename: `${business.slug}-loyalty-story.png`,
                                        aspect: "aspect-[9/16]",
                                    },
                                    {
                                        label: "Post",
                                        href: `/businesses/${business.slug}/post-image`,
                                        filename: `${business.slug}-loyalty-post.png`,
                                        aspect: "aspect-square",
                                    },
                                ]}
                                triggerLabel="Share card"
                            />
                        )}

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
                        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
                            <Card className="border-[#17233B]/10">
                                <CardHeader>
                                    <CardTitle>Stamp a customer&apos;s card</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-6 text-[#17233B]/65">
                                        Scan the QR code on the customer&apos;s card with your phone
                                        camera, or type the code shown under it.
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
                                        <SubmitButton size="lg" pendingLabel="Finding…">Find card</SubmitButton>
                                    </form>

                                    <dl className="mt-8 grid grid-cols-3 gap-3 text-center">
                                        {[
                                            ["Members", stats.members],
                                            ["Stamps this week", stats.stampsThisWeek],
                                            ["Rewards given", stats.rewards],
                                        ].map(([label, value]) => (
                                            <div key={label} className="rounded-xl bg-[#FFF8F0] px-3 py-4">
                                                <dt className="text-xs text-[#17233B]/70">{label}</dt>
                                                <dd className="mt-1 text-2xl font-semibold">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </CardContent>
                            </Card>

                            <Card className="h-fit border-[#17233B]/10 bg-[#17233B] text-white">
                                <CardContent className="p-6">
                                    <p className="text-sm text-white/70">
                                        {program.is_active ? "Live on your business page" : "Paused"}
                                    </p>
                                    <p className="mt-2 text-xl font-semibold">
                                        Collect {program.stamps_required} stamps, get {program.reward.charAt(0).toLowerCase() + program.reward.slice(1)}
                                    </p>
                                    <div className="mt-5">
                                        <LoyaltyStamps
                                            stamps={Math.min(3, program.stamps_required - 1)}
                                            required={program.stamps_required}
                                            size="sm"
                                            colour={program.card_colour}
                                            icon={program.stamp_icon}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {canManage && (
                            <Card className="mt-6 border-[#17233B]/10">
                                <CardHeader>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <CardTitle>Card settings</CardTitle>
                                        <form action={setLoyaltyProgramActive}>
                                            <input type="hidden" name="businessId" value={businessId} />
                                            <input type="hidden" name="programId" value={program.id} />
                                            <input type="hidden" name="active" value={String(!program.is_active)} />
                                            <Button type="submit" variant="outline" size="sm">
                                                {program.is_active ? "Pause loyalty card" : "Resume loyalty card"}
                                            </Button>
                                        </form>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ProgramSettingsForm businessId={businessId} program={program} submitLabel="Save changes" />
                                    <p className="mt-4 text-xs text-[#17233B]/70">
                                        Changing the number of stamps applies to everyone&apos;s card straight away.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {cardList.length === 0 ? (
                    <div className="mt-6 rounded-xl border border-dashed border-[#17233B]/20 bg-white px-6 py-14 text-center">
                        <h2 className="text-xl font-semibold">No loyalty cards yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-[#17233B]/65">
                            Cards appear here as customers join from your business page.
                        </p>
                    </div>
                ) : (
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
                                                    <span className="text-xs text-[#17233B]/60">
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
