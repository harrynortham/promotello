import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiPrinter } from "react-icons/fi";

import { LoyaltyCard } from "@/components/loyalty-card";
import { StampQr } from "@/components/stamp-qr";
import { ScanQrButton } from "@/components/scan-qr-button";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormAndPreviewLoading } from "@/components/dashboard-skeletons";
import { businessHasPro } from "@/lib/billing";
import { SAMPLE_CARD_CODE } from "@/lib/loyalty-design";
import { ukDate } from "@/lib/uk-time";
import { createClient } from "@/utils/supabase/server";
import { lookUpLoyaltyCard } from "./actions";
import { LoyaltyHowItWorks } from "./how-it-works";
import { LoyaltyCardBuilder } from "./program-form";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{
        error?: string;
        saved?: string;
        closed?: string;
        reopened?: string;
        // One page each, because the two lists are read for different
        // reasons and nobody wants the other one jumping.
        collecting?: string;
        issued?: string;
    }>;
};

type LoyaltyCardRow = {
    id: string;
    program_id: string;
    card_code: string;
    stamps: number;
    rewards_redeemed: number;
    created_at: string;
    last_stamped_at: string | null;
    finished_at: string | null;
};

type Program = {
    id: string;
    name: string;
    closed_at: string | null;
    stamps_required: number;
    reward: string;
    terms: string | null;
    is_active: boolean;
    card_colour: string | null;
    card_header: string | null;
    card_accent: string | null;
    stamp_icon: string | null;
};

const errorMessages: Record<string, string> = {
    invalid: "Choose between 3 and 20 stamps and describe the reward in 2 to 80 characters.",
    pro: "Loyalty cards are part of Pro. Upgrade to start a stamp card.",
    save: "We couldn't save the loyalty card. Please try again.",
    name: "You have had a card with that name before, so this one needs a different name — even a closed card keeps hold of its own.",
    frozen: "Customers are collecting that card, so its stamps and reward stay as they are. Start a new card to change the deal.",
    code: "That doesn't look like a card code. Codes are 10 letters and numbers.",
    another: "Another card is on offer, and only one at a time can take new joiners. Stop handing that one out first.",
};

function weekAgo() {
    return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

// A page of a list, and what to say underneath it. Both lists on this
// page are short enough to hold in memory — the stats above them are
// counted from the same rows — so this is about what a person can read
// at once, not about what the database hands back.
const PER_PAGE = { collecting: 5, issued: 10 };

function pageOf<Row>(rows: Row[], requested: string | undefined, size: number) {
    const totalPages = Math.max(1, Math.ceil(rows.length / size));
    const asked = Number(requested ?? "1");
    const page = Number.isInteger(asked) && asked >= 1 && asked <= totalPages ? asked : 1;

    return { page, totalPages, rows: rows.slice((page - 1) * size, page * size) };
}

// Prev and next, with the other list's page carried along so moving
// down one doesn't reset the other.
function Pager({
    label,
    basePath,
    param,
    page,
    totalPages,
    keep,
}: {
    label: string;
    basePath: string;
    param: "collecting" | "issued";
    page: number;
    totalPages: number;
    keep: string;
}) {
    if (totalPages <= 1) return null;

    const href = (to: number) => `${basePath}?${param}=${to}${keep}#${param}`;

    return (
        <nav aria-label={label} className="mt-5 flex items-center justify-between gap-3">
            {page > 1 ? (
                <Button render={<Link href={href(page - 1)} />} nativeButton={false} variant="outline" size="sm">
                    Previous
                </Button>
            ) : (
                <span />
            )}

            <span className="text-sm text-[#17233B]/65">
                Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
                <Button render={<Link href={href(page + 1)} />} nativeButton={false} variant="outline" size="sm">
                    Next
                </Button>
            ) : (
                <span />
            )}
        </nav>
    );
}


async function LoyaltyContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { error, saved, closed, reopened, collecting, issued }] = await Promise.all([
        params,
        searchParams,
    ]);
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
            .select("id, name, closed_at, stamps_required, reward, terms, is_active, card_colour, card_header, card_accent, stamp_icon")
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

    const allCards = (programs ?? []) as Program[];
    // One card is on offer. The others are cards people are still
    // finishing: closed to new joiners, stamped until their holders are
    // done, because a card in someone's wallet is a promise.
    const program = allCards.find((card) => card.is_active && !card.closed_at) ?? null;
    const cards = program ? [program] : [];
    const stillCollecting = allCards.filter((card) => card.id !== program?.id);
    const collectingPage = pageOf(stillCollecting, collecting, PER_PAGE.collecting);

    let stats = { members: 0, stampsThisWeek: 0, rewards: 0 };
    let cardList: LoyaltyCardRow[] = [];

    if (allCards.length > 0) {
        const { data: holders } = await supabase
            .from("loyalty_cards")
            .select("id, program_id, card_code, stamps, rewards_redeemed, created_at, last_stamped_at, finished_at")
            .in("program_id", allCards.map((card) => card.id))
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

    const issuedPage = pageOf(cardList, issued, PER_PAGE.issued);
    const basePath = `/business/${businessId}/loyalty`;

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

                    {/* Stacked on a phone, the guide under "How it
                        works"; side by side on anything wider, with the
                        guide to its left — which is what the reversed row
                        is for. */}
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row-reverse sm:items-center sm:gap-3">
                        <LoyaltyHowItWorks />

                        {/* For whoever is on the counter rather than on
                            this page: one sheet, printed once, stuck up. */}
                        <Button
                            render={<Link href={`/staff-guide/${businessId}`} />}
                            nativeButton={false}
                            variant="ghost"
                            size="lg"
                        >
                            <FiPrinter aria-hidden="true" />
                            Print the till guide
                        </Button>
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

                {closed && !error && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>That card is no longer handed out</AlertTitle>
                        <AlertDescription>
                            Nobody new can join it. The customers holding one finish it
                            and claim their reward once, then move to the card you hand
                            out next. You can hand this one out again from the card itself.
                        </AlertDescription>
                    </Alert>
                )}

                {reopened && !error && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>That card is on offer again</AlertTitle>
                        <AlertDescription>
                            It is back on your business page and customers can join it.
                            Anyone who finished it while it was closed is collecting on
                            it again.
                        </AlertDescription>
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
                    </>
                )}

                {/* Everything the business has, not only what it is
                    handing out: with every card closed there is still a
                    code to look up, numbers to read, and a card to put
                    back on offer. */}
                {allCards.length > 0 && (
                    <section className="mt-10">
                        <div className={`grid gap-5 ${cards.length > 0 ? "md:grid-cols-2" : ""}`}>
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
                                        Scan the QR code on the customer&apos;s card, or
                                        type the code shown under it.
                                    </p>

                                    <ScanQrButton className="mt-5 w-full sm:w-auto" />

                                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">
                                        Or type the code
                                    </p>

                                    <form action={lookUpLoyaltyCard} className="mt-2 flex gap-2">
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
                                            code={SAMPLE_CARD_CODE}
                                            qr={<StampQr code={SAMPLE_CARD_CODE} />}
                                            colour={card.card_colour}
                                            header={card.card_header}
                                            accent={card.card_accent}
                                            stampIcon={card.stamp_icon}
                                            active={card.is_active}
                                            className="border-[#17233B]/10"
                                        />

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <p className="mr-auto text-sm font-medium">
                                                {card.name}
                                                <span className="ml-2 text-xs font-normal text-[#17233B]/65">
                                                    On offer · {holders.length}{" "}
                                                    {holders.length === 1 ? "member" : "members"}
                                                </span>
                                            </p>

                                            {canManage && (
                                                <>
                                                    <Button
                                                        render={<Link href={`/business/${businessId}/loyalty/${card.id}/edit`} />}
                                                        nativeButton={false}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        {/* "Name and look" was honest about what
                                                            the terms do once somebody holds the
                                                            card, and wrong about the page: that is
                                                            also where the card is taken off offer.
                                                            The page says what is frozen. */}
                                                        Edit card
                                                    </Button>

                                                    {/* Changing the deal means a new card, so
                                                        the people holding this one keep what
                                                        they were promised. */}
                                                    <Button
                                                        render={<Link href={`/business/${businessId}/loyalty/new`} />}
                                                        nativeButton={false}
                                                        size="sm"
                                                    >
                                                        Change the deal
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

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

                        {stillCollecting.length > 0 && (
                            <div id="collecting" className="mt-8 scroll-mt-24">
                                <h3 className="text-lg font-semibold">Still being collected</h3>

                                <p className="mt-1 max-w-2xl text-sm text-[#17233B]/65">
                                    Cards you no longer hand out. The customers holding one
                                    fill it and claim what they were promised, once — then
                                    it&rsquo;s finished
                                    {program
                                        ? " and they carry on with your current card."
                                        : ". You aren't handing anything out at the moment: start a card above, or open one of these and hand it out again."}
                                </p>

                                <ul className="mt-4 space-y-2">
                                    {collectingPage.rows.map((card) => {
                                        const holders = cardList.filter(
                                            (holder) => holder.program_id === card.id,
                                        );
                                        const unfinished = holders.filter(
                                            (holder) => holder.stamps > 0 || holder.rewards_redeemed === 0,
                                        ).length;

                                        return (
                                            <li
                                                key={card.id}
                                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#17233B]/10 bg-white px-5 py-4"
                                            >
                                                <div>
                                                    <p className="font-medium">{card.name}</p>
                                                    <p className="text-sm text-[#17233B]/65">
                                                        {card.stamps_required} stamps for{" "}
                                                        {card.reward.charAt(0).toLowerCase() + card.reward.slice(1)} ·{" "}
                                                        {holders.length}{" "}
                                                        {holders.length === 1 ? "holder" : "holders"}
                                                        {unfinished > 0 && `, ${unfinished} still going`}
                                                        {/* When it stopped, so two cards of a kind
                                                            are told apart by more than position. */}
                                                        {card.closed_at && ` · stopped ${ukDate(card.closed_at)}`}
                                                    </p>
                                                </div>

                                                {canManage && (
                                                    <Button
                                                        render={<Link href={`/business/${businessId}/loyalty/${card.id}/edit`} />}
                                                        nativeButton={false}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        Open
                                                    </Button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <Pager
                                    label="Cards still being collected"
                                    basePath={basePath}
                                    param="collecting"
                                    page={collectingPage.page}
                                    totalPages={collectingPage.totalPages}
                                    keep={issuedPage.page > 1 ? `&issued=${issuedPage.page}` : ""}
                                />
                            </div>
                        )}
                    </section>
                )}

                {cardList.length > 0 && (
                    <section id="issued" className="mt-10 scroll-mt-24">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold">Loyalty cards issued</h3>

                                <p className="mt-1 max-w-2xl text-sm text-[#17233B]/65">
                                    Every card a customer is carrying, on any of your
                                    cards, with how far along it is. The code is what
                                    they show you to be stamped.
                                </p>
                            </div>

                            <p className="text-sm text-[#17233B]/65">
                                {cardList.length} {cardList.length === 1 ? "card" : "cards"}
                            </p>
                        </div>

                        <Card className="mt-4 border-[#17233B]/10">
                            <CardContent>
                            <ul className="divide-y divide-[#17233B]/10">
                                {issuedPage.rows.map((card) => {
                                    // The card it is on, which is not
                                    // always the one being handed out:
                                    // a business sees out every closed
                                    // card its customers still hold.
                                    const its = allCards.find((one) => one.id === card.program_id);
                                    const finished = card.finished_at !== null;
                                    const complete = !finished && card.stamps >= (its?.stamps_required ?? 0);

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

                                                {finished && (
                                                    <span className="rounded-full bg-[#17233B]/5 px-2.5 py-0.5 text-xs font-semibold text-[#17233B]/70">
                                                        Finished
                                                    </span>
                                                )}

                                                {/* Which of them it is on, once there is
                                                    more than one to be on. */}
                                                {allCards.length > 1 && its && (
                                                    <span className="text-xs text-[#17233B]/65">{its.name}</span>
                                                )}

                                                {card.rewards_redeemed > 0 && (
                                                    <span className="text-xs text-[#17233B]/65">
                                                        {card.rewards_redeemed} redeemed
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#17233B]/65">
                                                <span className="font-medium text-[#17233B]">
                                                    {card.stamps} of {its?.stamps_required ?? "?"} stamps
                                                </span>

                                                <span className="text-xs">
                                                    Issued {new Date(card.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                                </span>

                                                {/* The card itself, and the stamp button with
                                                    it: the same page their phone's QR opens. */}
                                                <Button
                                                    render={<Link href={`/stamp/${card.card_code}`} />}
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Show card
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                                </ul>

                                <Pager
                                    label="Loyalty cards issued"
                                    basePath={basePath}
                                    param="issued"
                                    page={issuedPage.page}
                                    totalPages={issuedPage.totalPages}
                                    keep={collectingPage.page > 1 ? `&collecting=${collectingPage.page}` : ""}
                                />
                            </CardContent>
                        </Card>
                    </section>
                )}
            </div>
        </div>
    );
}

export default function LoyaltyPage(props: PageProps) {
    return (
        <Suspense fallback={<FormAndPreviewLoading />}>
            <LoyaltyContent {...props} />
        </Suspense>
    );
}
