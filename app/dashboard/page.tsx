import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiArrowRight, FiBriefcase, FiCheckCircle, FiCompass, FiGift } from "react-icons/fi";

import { EmptyState, SectionHeading } from "@/components/listing-ui";
import { OfferCard } from "@/components/offer-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLiveOffers } from "@/lib/listings";
import { createClient } from "@/utils/supabase/server";

type VoucherRow = {
    id: string;
    redemption_code: string;
    used_at: string | null;
    offers: {
        slug: string;
        title: string;
        discount: string;
        image_url: string | null;
        expires_at: string;
        businesses: { name: string } | { name: string }[] | null;
    } | null;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 sm:px-10">
            <div className="mx-auto max-w-6xl">
                <Skeleton className="h-10 w-64 rounded-md" />
                <div className="mt-8 grid gap-5 sm:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-28 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="mt-10 h-64 rounded-2xl" />
            </div>
        </main>
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

    const [{ data: vouchers }, { count: businessCount }, liveOffers] = await Promise.all([
        supabase
            .from("offer_redemptions")
            .select(
                `
                    id, redemption_code, used_at,
                    offers ( slug, title, discount, image_url, expires_at, businesses ( name ) )
                `,
            )
            .eq("user_id", user.id)
            .order("redeemed_at", { ascending: false }),
        supabase
            .from("business_members")
            .select("business_id", { count: "exact", head: true })
            .eq("user_id", user.id),
        getLiveOffers(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const rows = (vouchers ?? []) as unknown as VoucherRow[];
    const ready = rows.filter((row) => !row.used_at && row.offers && row.offers.expires_at >= today);
    const usedCount = rows.filter((row) => row.used_at).length;
    const claimedSlugs = new Set(rows.map((row) => row.offers?.slug));
    const suggestions = liveOffers.filter((offer) => !claimedSlugs.has(offer.slug)).slice(0, 4);
    const hasBusiness = (businessCount ?? 0) > 0;

    const firstName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.split(" ")[0]) ||
        null;

    const stats = [
        { icon: FiGift, label: "Ready to use", value: ready.length },
        { icon: FiCheckCircle, label: "Used", value: usedCount },
        { icon: FiCompass, label: "Live offers to explore", value: liveOffers.length },
    ];

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:px-10 sm:py-14">
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
                            Your vouchers, and new offers from businesses around Bristol.
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
                            <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-[#17233B]/10 bg-white p-5">
                                <div>
                                    <p className="text-sm text-[#17233B]/60">{stat.label}</p>
                                    <p className="mt-1 text-3xl font-semibold">{stat.value}</p>
                                </div>
                                <Icon aria-hidden="true" className="size-6 text-[#FF593F]" />
                            </div>
                        );
                    })}
                </div>

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
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {ready.slice(0, 6).map((row) => {
                                    const offer = row.offers!;
                                    const business = Array.isArray(offer.businesses) ? offer.businesses[0] : offer.businesses;

                                    return (
                                        <Link
                                            key={row.id}
                                            href="/dashboard/redemptions"
                                            className="group flex overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white transition hover:shadow-md"
                                        >
                                            <div className="relative w-28 shrink-0 bg-[#FFF4E8]">
                                                {offer.image_url && (
                                                    <Image src={offer.image_url} alt="" fill sizes="112px" className="object-cover" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1 p-4">
                                                <p className="truncate text-sm text-[#17233B]/60">{business?.name}</p>
                                                <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">{offer.title}</p>
                                                <p className="mt-3 inline-flex rounded-lg bg-[#17233B] px-2.5 py-1 font-mono text-sm font-semibold tracking-widest text-white">
                                                    {row.redemption_code}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
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
        </main>
    );
}

export default function CustomerDashboardPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <CustomerDashboardContent />
        </Suspense>
    );
}
