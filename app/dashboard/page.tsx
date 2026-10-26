import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiArrowRight, FiBriefcase, FiCheckCircle, FiGift, FiStar } from "react-icons/fi";

import { EmptyState, SectionHeading } from "@/components/listing-ui";
import { OfferCard } from "@/components/offer-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { placeName } from "@/lib/cities";
import { getLiveOffers } from "@/lib/listings";
import { getVisitorContext } from "@/lib/visitor";
import { createClient } from "@/utils/supabase/server";

import { VoucherGrid, statusPages } from "./redemptions/voucher-list";
import { groupVouchers } from "./redemptions/voucher-status";
import { getWallet } from "./redemptions/wallet";

type ReviewPrompt = {
    business_id: string;
    business_name: string;
    logo_url: string | null;
    source: "voucher" | "loyalty";
    happened_at: string;
};

function visitedLabel(happenedAt: string) {
    const days = Math.floor((Date.now() - new Date(happenedAt).getTime()) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
}

function LoadingState() {
    return (
        <div>
            <div className="mx-auto max-w-6xl">
                <Skeleton className="h-10 w-64 rounded-md" />
                <div className="mt-8 grid gap-5 sm:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-28 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="mt-10 h-64 rounded-2xl" />
            </div>
        </div>
    );
}

async function CustomerDashboardContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Suggestions come from the city they're browsing, like the home page.
    const visitor = await getVisitorContext();

    const [{ vouchers }, { count: businessCount }, { count: loyaltyCount }, liveOffers, { data: reviewPrompts }, place] = await Promise.all([
        getWallet(user.id),
        supabase
            .from("business_members")
            .select("business_id", { count: "exact", head: true })
            .eq("user_id", user.id),
        supabase
            .from("loyalty_cards")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        getLiveOffers(visitor.city?.id),
        supabase.rpc("review_prompts_for_current_user"),
        placeName(visitor.city),
    ]);

    const prompts = (reviewPrompts ?? []) as ReviewPrompt[];

    const { ready, used } = groupVouchers(vouchers);
    const claimedSlugs = new Set(vouchers.map((voucher) => voucher.offer?.slug));
    const suggestions = liveOffers.filter((offer) => !claimedSlugs.has(offer.slug)).slice(0, 4);
    const hasBusiness = (businessCount ?? 0) > 0;

    const firstName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.split(" ")[0]) ||
        null;

    const stats = [
        { icon: FiGift, label: "Vouchers ready to use", value: ready.length, href: statusPages.ready.href },
        { icon: FiCheckCircle, label: "Vouchers used", value: used.length, href: statusPages.used.href },
        { icon: FiStar, label: "Loyalty cards", value: loyaltyCount ?? 0, href: "/dashboard/loyalty" },
    ];

    return (
        <div className="text-[#17233B]">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Your Promotello
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {firstName ? `Hi ${firstName}` : "Welcome back"}
                        </h1>
                        <p className="mt-2 text-[#17233B]/65">
                            Your vouchers, and new offers from businesses around {place}.
                        </p>
                    </div>

                    <Button render={<Link href="/offers" />} nativeButton={false} size="lg">
                        Find offers
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {stats.map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <Link key={stat.label} href={stat.href} className="flex items-center justify-between rounded-2xl border border-[#17233B]/10 bg-white p-5 transition hover:border-[#17233B]/25 hover:shadow-sm">
                                <div>
                                    <p className="text-sm text-[#17233B]/70">{stat.label}</p>
                                    <p className="mt-1 text-3xl font-semibold">{stat.value}</p>
                                </div>
                                <Icon aria-hidden="true" className="size-6 text-[#FF593F]" />
                            </Link>
                        );
                    })}
                </div>

                {prompts.length > 0 && (
                    <section className="mt-12 space-y-3" aria-label="Review your recent visits">
                        {prompts.map((prompt) => (
                            <div
                                key={prompt.business_id}
                                className="flex flex-col gap-4 rounded-2xl border border-[#FF593F]/30 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    {prompt.logo_url ? (
                                        <Image src={prompt.logo_url} alt="" width={48} height={48} className="size-12 rounded-xl object-cover" />
                                    ) : (
                                        <span className="flex size-12 items-center justify-center rounded-xl bg-[#FFF4E8] text-lg font-semibold text-[#FF593F]">
                                            {prompt.business_name.charAt(0)}
                                        </span>
                                    )}
                                    <div>
                                        <p className="font-semibold">How was your visit to {prompt.business_name}?</p>
                                        <p className="text-sm text-[#17233B]/70">
                                            {prompt.source === "loyalty" ? "You got a loyalty stamp" : "You used a voucher"}{" "}
                                            {visitedLabel(prompt.happened_at)}. A quick Google review really helps small businesses.
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    render={<a href={`/review/${prompt.business_id}?source=${prompt.source}`} target="_blank" rel="noreferrer" />}
                                    nativeButton={false}
                                    className="shrink-0 bg-[#17233B] text-white hover:bg-[#17233B]/90"
                                >
                                    <FiStar aria-hidden="true" />
                                    Leave a Google review
                                </Button>
                            </div>
                        ))}
                    </section>
                )}

                <section className="mt-12">
                    <SectionHeading
                        title="Ready to use"
                        href="/dashboard/redemptions"
                        linkLabel="All my vouchers"
                    />

                    <div className="mt-6">
                        {ready.length === 0 ? (
                            <EmptyState
                                title="No vouchers yet"
                                description="Claim an offer and your code appears here, ready to show when you pay."
                                href="/offers"
                                linkLabel="Browse offers"
                            />
                        ) : (
                            <VoucherGrid items={ready.slice(0, 6)} />
                        )}
                    </div>
                </section>

                {suggestions.length > 0 && (
                    <section className="mt-14">
                        <SectionHeading title="New offers to try" href="/offers" linkLabel="Browse all offers" />

                        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {suggestions.map((offer) => (
                                <OfferCard
                                    key={offer.id}
                                    slug={offer.slug}
                                    discount={offer.discount}
                                    title={offer.title}
                                    description={offer.description}
                                    availability={offer.availability}
                                    business={offer.business.name}
                                    businessLogoUrl={offer.business.logoUrl}
                                    imageUrl={offer.imageUrl}
                                    expiresAt={offer.expiresAt}
                                    area={offer.business.area}
                                />
                            ))}
                        </div>
                    </section>
                )}

                <section className="mt-14 flex flex-col gap-5 rounded-3xl bg-[#17233B] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                            <FiBriefcase aria-hidden="true" className="size-5" />
                        </span>
                        <div>
                            <h2 className="text-xl font-semibold">
                                {hasBusiness ? "Your business" : "Run a local business?"}
                            </h2>
                            <p className="mt-1 text-white/70">
                                {hasBusiness
                                    ? "Manage your offers, redemptions and billing."
                                    : "List it for free and publish your first offer in minutes."}
                            </p>
                        </div>
                    </div>

                    <Button
                        render={<Link href={hasBusiness ? "/business/dashboard" : "/business"} />}
                        nativeButton={false}
                        className="shrink-0 bg-white text-[#17233B] hover:bg-white/90"
                    >
                        {hasBusiness ? "Business dashboard" : "List your business"}
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </section>
            </div>
        </div>
    );
}

export default function CustomerDashboardPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <CustomerDashboardContent />
        </Suspense>
    );
}
