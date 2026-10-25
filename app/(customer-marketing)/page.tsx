import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowRight, FiCheckCircle, FiMapPin, FiSearch, FiSmartphone } from "react-icons/fi";

import { BusinessCard } from "@/components/business-card";
import {
    CategoryTile,
    SearchForm,
    SectionHeading,
} from "@/components/listing-ui";
import { OfferCard } from "@/components/offer-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    areasFrom,
    categoryImage,
    filterOffers,
    getCategories,
    getLiveOffers,
    getPublicBusinesses,
    offerCountsByCategory,
} from "@/lib/listings";
import { LocationSearch } from "@/components/location-search";
import { NotHereYet } from "@/components/visitor-city";
import { areaPath, cityPhotosFor, getLiveCities, placeName, type City } from "@/lib/cities";
import { getVisitorContext } from "@/lib/visitor";

const steps = [
    {
        icon: FiSearch,
        title: "Find an offer",
        description: "Browse deals from independent cafés, shops and studios near you.",
    },
    {
        icon: FiSmartphone,
        title: "Claim your code",
        description: "Sign in and claim the offer. Your code is saved to your account.",
    },
    {
        icon: FiCheckCircle,
        title: "Show it in store",
        description: "Show your code when you pay, and the business applies the discount.",
    },
];

function HomeLoading() {
    return (
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                    <Skeleton key={item} className="aspect-[5/4] rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

async function HomeListings({ city }: { city: City | null }) {
    await connection();

    const [groups, offers, businesses, place, photos, places] = await Promise.all([
        getCategories(),
        getLiveOffers(city?.id),
        getPublicBusinesses(city?.id),
        placeName(city),
        cityPhotosFor(city),
        getLiveCities(),
    ]);

    const suffix = city ? `/${city.slug}` : "";

    const areaHref = (name: string) => {
        const cityId = businesses.find((business) => business.area === name)?.cityId;
        const home = places.find((item) => item.id === cityId);
        return (home && areaPath(home, name)) ?? `/explore${suffix}?area=${encodeURIComponent(name)}`;
    };

    const counts = offerCountsByCategory(offers, groups);
    const newest = offers.slice(0, 8);
    const endingSoon = filterOffers(offers, groups, { sort: "ending-soon" }).slice(0, 4);
    const featured = businesses.filter((business) => business.offerCount > 0).slice(0, 6);
    const areas = areasFrom(businesses).slice(0, 10);

    return (
        <>
            <section className="mx-auto max-w-7xl px-6 pt-16 sm:px-10 sm:pt-20">
                <SectionHeading
                    eyebrow="Browse by category"
                    title="What are you in the mood for?"
                    href="/categories"
                    linkLabel="All categories"
                />

                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                        <CategoryTile
                            key={group.id}
                            href={`/categories/${group.slug}${suffix}`}
                            name={group.name}
                            tagline={group.description}
                            image={categoryImage(group)}
                            count={counts[group.slug] ?? 0}
                        />
                    ))}
                </div>
            </section>

            {newest.length > 0 && (
                <section className="mx-auto max-w-7xl px-6 pt-20 sm:px-10">
                    <SectionHeading
                        eyebrow="Fresh offers"
                        title="New on Promotello"
                        description={`The latest offers from businesses around ${place}.`}
                        href={`/offers${suffix}`}
                        linkLabel="Browse all offers"
                    />

                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {newest.map((offer) => (
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

            {areas.length > 0 && (
                <section className="mx-auto mt-20 max-w-7xl px-6 sm:px-10">
                    <div className="grid overflow-hidden rounded-3xl bg-[#17233B] text-white lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="p-8 sm:p-12">
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF8A73]">
                                Explore {place}
                            </p>

                            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                Find something good on your doorstep.
                            </h2>

                            <p className="mt-4 max-w-lg text-white/70">
                                See what independent businesses are offering in
                                each part of {place}, from{" "}
                                {areas.slice(0, 2).map((area) => area.name).join(" to ")}{" "}
                                and beyond.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-2">
                                {areas.map((area) => (
                                    <Link
                                        key={area.name}
                                        href={areaHref(area.name)}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                                    >
                                        <FiMapPin aria-hidden="true" className="size-3.5" />
                                        {area.name}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="relative min-h-64">
                            <Image
                                src={photos.feature}
                                alt={photos.featureAlt}
                                fill
                                sizes="(min-width: 1024px) 45vw, 100vw"
                                className="object-cover"
                            />
                        </div>
                    </div>
                </section>
            )}

            {endingSoon.length > 0 && (
                <section className="mx-auto max-w-7xl px-6 pt-20 sm:px-10">
                    <SectionHeading
                        eyebrow="Don't miss out"
                        title="Ending soon"
                        href={`/offers${suffix}?sort=ending-soon`}
                        linkLabel="See what's ending"
                    />

                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {endingSoon.map((offer) => (
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

            {featured.length > 0 && (
                <section className="mx-auto max-w-7xl px-6 pt-20 sm:px-10">
                    <SectionHeading
                        eyebrow="Local favourites"
                        title="Businesses worth knowing"
                        href={`/businesses${suffix}`}
                        linkLabel="All businesses"
                    />

                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {featured.map((business) => (
                            <BusinessCard key={business.id} business={business} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}

async function HeroStats({ city }: { city: City | null }) {
    await connection();

    const [offers, businesses, place] = await Promise.all([
        getLiveOffers(city?.id),
        getPublicBusinesses(city?.id),
        placeName(city),
    ]);

    if (offers.length === 0) {
        return null;
    }

    return (
        <p className="mt-6 text-sm text-white/75">
            <span className="font-semibold text-white">{offers.length} live offers</span>{" "}
            from{" "}
            <span className="font-semibold text-white">
                {businesses.length} independent businesses
            </span>{" "}
            across {place}
        </p>
    );
}

// The hero and listings, for the visitor's city: their choice, or where
// they are. Elsewhere, every live city with a "not here yet" note.
async function VisitorHome() {
    const visitor = await getVisitorContext();
    const [place, places, photos] = await Promise.all([
        placeName(visitor.city),
        getLiveCities(),
        cityPhotosFor(visitor.city),
    ]);

    return (
        <>
            <NotHereYet visitor={visitor} />

            <section className="relative isolate overflow-hidden">
                <Image
                    src={photos.hero}
                    alt={photos.heroAlt}
                    fill
                    priority
                    sizes="100vw"
                    className="-z-10 object-cover"
                />

                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#17233B]/90 via-[#17233B]/70 to-[#17233B]/20" />

                <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-32">
                    <div className="max-w-2xl">
                        <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur">
                            {place}&apos;s local offers, in one place
                        </p>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                            Save on the places you love.
                        </h1>

                        <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
                            Discover offers from independent cafés, shops,
                            studios and stays, and support the businesses that
                            make your neighbourhood.
                        </p>

                        <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-[1fr_15rem]">
                            <SearchForm
                                action="/offers"
                                placeholder="Try coffee, haircut or pizza"
                                size="lg"
                            />
                            <LocationSearch places={places} basePath="/explore" current={visitor.city} size="lg" />
                        </div>

                        <Suspense fallback={<p className="mt-6 h-5" />}>
                            <HeroStats city={visitor.city} />
                        </Suspense>
                    </div>
                </div>
            </section>

            <Suspense fallback={<HomeLoading />}>
                <HomeListings city={visitor.city} />
            </Suspense>
        </>
    );
}

function HeroLoading() {
    return (
        <>
            <div className="h-[34rem] bg-[#17233B]" />
            <HomeLoading />
        </>
    );
}

export default function HomePage() {
    return (
        <main className="bg-[#FFF8F0] pb-20 text-[#17233B]">
            <Suspense fallback={<HeroLoading />}>
                <VisitorHome />
            </Suspense>


            <section className="mx-auto max-w-7xl px-6 pt-24 sm:px-10">
                <SectionHeading
                    eyebrow="How it works"
                    title="Three steps to a better deal"
                />

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                    {steps.map((step, index) => {
                        const Icon = step.icon;

                        return (
                            <div
                                key={step.title}
                                className="rounded-2xl border border-[#17233B]/10 bg-white p-7"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex size-11 items-center justify-center rounded-xl bg-[#FF593F]/10 text-[#FF593F]">
                                        <Icon aria-hidden="true" className="size-5" />
                                    </span>
                                    <span className="text-sm font-semibold text-[#17233B]/40">
                                        Step {index + 1}
                                    </span>
                                </div>

                                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                                <p className="mt-2 leading-7 text-[#17233B]/65">{step.description}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pt-20 sm:px-10">
                <div className="flex flex-col items-start gap-6 rounded-3xl bg-[#FF593F] px-8 py-12 text-white sm:flex-row sm:items-center sm:justify-between sm:px-12">
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight">
                            Run a local business?
                        </h2>
                        <p className="mt-2 max-w-xl text-white/85">
                            List your business and your first offer for free,
                            and give nearby customers a reason to visit.
                        </p>
                    </div>

                    <Button
                        render={<Link href="/business" />}
                        nativeButton={false}
                        size="lg"
                        className="shrink-0 bg-white text-[#17233B] hover:bg-white/90"
                    >
                        List your business
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>
            </section>
        </main>
    );
}
