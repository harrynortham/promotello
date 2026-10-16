"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { OfferCard } from "@/components/offer-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

const categories = [
    "All categories",
    "Food & drink",
    "Things to do",
    "Shopping",
    "Health & beauty",
    "Services",
    "Travel & stays",
];

type SortOption = "newest" | "expiring" | "popular";

type ExploreOffer = {
    id: string;
    slug: string;
    category: string;
    discount: string;
    title: string;
    description: string;
    availability: string;
    expires_at: string;
    redemption_count: number;
    created_at: string;
    businesses:
    | {
        id: string;
        name: string;
    }
    | {
        id: string;
        name: string;
    }[]
    | null;
};

function formatSort(value: string | null): SortOption {
    if (value === "expiring" || value === "popular") {
        return value;
    }

    return "newest";
}

export default function ExploreContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [offers, setOffers] = useState<ExploreOffer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const search = searchParams.get("search") ?? "";
    const selectedCategory =
        searchParams.get("category") ?? "All categories";
    const sort = formatSort(searchParams.get("sort"));

    useEffect(() => {
        async function loadOffers() {
            const supabase = createClient();

            const { data, error } = await supabase
                .from("offers")
                .select(
                    `
                        id,
                        slug,
                        category,
                        discount,
                        title,
                        description,
                        availability,
                        expires_at,
                        redemption_count,
                        created_at,
                        businesses!inner (
                            id,
                            name,
                            approval_status
                        )
                    `,
                )
                .eq("approval_status", "approved")
                .eq("businesses.approval_status", "approved")
                .gte(
                    "expires_at",
                    new Date().toISOString().slice(0, 10),
                )
                .order("created_at", { ascending: false });

            if (error) {
                console.error(error);
                setErrorMessage(
                    "We couldn’t load promotions right now. Please try again.",
                );
                setIsLoading(false);
                return;
            }

            setOffers((data ?? []) as ExploreOffer[]);
            setIsLoading(false);
        }

        loadOffers();
    }, []);

    function updateFilters(
        updates: Record<string, string | null>,
    ) {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
            if (!value || value === "All categories" || value === "newest") {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });

        const query = params.toString();

        router.replace(query ? `${pathname}?${query}` : pathname);
    }

    const filteredOffers = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        const results = offers.filter((offer) => {
            const business = Array.isArray(offer.businesses)
                ? offer.businesses[0]
                : offer.businesses;

            const matchesSearch =
                !normalizedSearch ||
                offer.title.toLowerCase().includes(normalizedSearch) ||
                offer.description
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                business?.name.toLowerCase().includes(normalizedSearch);

            const matchesCategory =
                selectedCategory === "All categories" ||
                offer.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        return [...results].sort((a, b) => {
            if (sort === "popular") {
                return b.redemption_count - a.redemption_count;
            }

            if (sort === "expiring") {
                return (
                    new Date(a.expires_at).getTime() -
                    new Date(b.expires_at).getTime()
                );
            }

            return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );
        });
    }, [offers, search, selectedCategory, sort]);

    function clearFilters() {
        router.replace(pathname);
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-7xl">
                <section className="rounded-3xl bg-[#17233B] px-6 py-10 text-white sm:px-10">
                    <Badge className="bg-[#FF593F] text-[#17233B] hover:bg-[#FF593F]">
                        Discover local deals
                    </Badge>

                    <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                        Find your next favourite place.
                    </h1>

                    <p className="mt-4 max-w-2xl leading-7 text-white/70">
                        Search local promotions, discover new businesses, and
                        save money on the things you already love.
                    </p>

                    <div className="mt-8 max-w-2xl">
                        <Input
                            value={search}
                            onChange={(event) =>
                                updateFilters({
                                    search: event.target.value,
                                })
                            }
                            placeholder="Search businesses or promotions..."
                            className="h-12 border-white/20 bg-white text-[#17233B] placeholder:text-[#17233B]/50"
                        />
                    </div>
                </section>

                <section className="mt-8">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Browse deals
                        </p>

                        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                            Explore local promotions
                        </h2>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <Button
                                key={category}
                                type="button"
                                size="sm"
                                variant={
                                    selectedCategory === category
                                        ? "default"
                                        : "outline"
                                }
                                className="rounded-full"
                                onClick={() =>
                                    updateFilters({
                                        category,
                                    })
                                }
                            >
                                {category}
                            </Button>
                        ))}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#17233B]/10 pb-5">
                        <p className="text-sm text-[#17233B]/60">
                            {filteredOffers.length} promotion
                            {filteredOffers.length === 1 ? "" : "s"} found
                        </p>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={
                                    sort === "newest"
                                        ? "secondary"
                                        : "outline"
                                }
                                onClick={() =>
                                    updateFilters({ sort: "newest" })
                                }
                            >
                                Newest
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant={
                                    sort === "expiring"
                                        ? "secondary"
                                        : "outline"
                                }
                                onClick={() =>
                                    updateFilters({ sort: "expiring" })
                                }
                            >
                                Expiring soon
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant={
                                    sort === "popular"
                                        ? "secondary"
                                        : "outline"
                                }
                                onClick={() =>
                                    updateFilters({ sort: "popular" })
                                }
                            >
                                Most popular
                            </Button>
                        </div>
                    </div>
                </section>

                {errorMessage ? (
                    <Alert variant="destructive" className="mt-8">
                        <AlertTitle>
                            Unable to load promotions
                        </AlertTitle>

                        <AlertDescription>
                            {errorMessage}
                        </AlertDescription>
                    </Alert>
                ) : filteredOffers.length === 0 && !isLoading ? (
                    <Card className="mt-8 rounded-3xl border-dashed">
                        <CardHeader>
                            <CardTitle>No promotions found</CardTitle>

                            <CardDescription>
                                Try another search term or choose a different
                                category.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearFilters}
                            >
                                Clear filters
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <section className="mt-8 grid gap-6 md:grid-cols-2">
                        {isLoading
                            ? [1, 2, 3, 4].map((item) => (
                                <Card
                                    key={item}
                                    className="h-80 animate-pulse rounded-3xl bg-white"
                                />
                            ))
                            : filteredOffers.map((offer) => {
                                const business = Array.isArray(
                                    offer.businesses,
                                )
                                    ? offer.businesses[0]
                                    : offer.businesses;

                                return (
                                    <OfferCard
                                        key={offer.id}
                                        slug={offer.slug}
                                        discount={offer.discount}
                                        title={offer.title}
                                        description={offer.description}
                                        availability={
                                            offer.availability
                                        }
                                        business={business?.name}
                                        expiresAt={offer.expires_at}
                                    />
                                );
                            })}
                    </section>
                )}
            </div>
        </main>
    );
}