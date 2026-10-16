"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { OfferCard } from "@/components/offer-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

const categories = [
    "All promotions",
    "Food & drink",
    "Things to do",
    "Shopping",
    "Health & beauty",
    "Services",
    "Travel & stays",
];

type SortOption = "newest" | "expiring" | "popular";

type Promotion = {
    id: string;
    slug: string;
    category: string;
    discount: string;
    title: string;
    description: string;
    availability: string;
    expires_at: string;
    created_at: string;
    redemption_count: number;
    businesses:
    | {
        name: string;
    }
    | {
        name: string;
    }[]
    | null;
};

function getSort(value: string | null): SortOption {
    if (value === "expiring" || value === "popular") {
        return value;
    }

    return "newest";
}

export default function OffersContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [offers, setOffers] = useState<Promotion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const search = searchParams.get("search") ?? "";
    const selectedCategory =
        searchParams.get("category") ?? "All promotions";
    const sort = getSort(searchParams.get("sort"));

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
                        created_at,
                        redemption_count,
                        businesses!inner (
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

            setOffers((data ?? []) as Promotion[]);
            setIsLoading(false);
        }

        loadOffers();
    }, []);

    function updateFilters(
        updates: Record<string, string | null>,
    ) {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
            if (
                !value ||
                value === "All promotions" ||
                value === "newest"
            ) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });

        const query = params.toString();

        router.replace(query ? `${pathname}?${query}` : pathname);
    }

    function clearFilters() {
        router.replace(pathname);
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
                selectedCategory === "All promotions" ||
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

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-7xl">
                <section className="rounded-3xl bg-white px-6 py-10 shadow-sm sm:px-10">
                    <Badge className="bg-[#FF593F] text-[#17233B] hover:bg-[#FF593F]">
                        Promotion catalogue
                    </Badge>

                    <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                        Browse all promotions.
                    </h1>

                    <p className="mt-4 max-w-2xl leading-7 text-[#17233B]/65">
                        Find discounts, try something new, and make the most of
                        local businesses.
                    </p>

                    <div className="mt-8 max-w-2xl">
                        <Input
                            value={search}
                            onChange={(event) =>
                                updateFilters({
                                    search: event.target.value,
                                })
                            }
                            placeholder="Search promotions or businesses..."
                            className="h-12"
                        />
                    </div>
                </section>

                <section className="mt-8">
                    <div className="flex flex-col gap-5 border-b border-[#17233B]/10 pb-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                                    Find your next deal
                                </p>

                                <h2 className="mt-2 text-2xl font-semibold">
                                    Available promotions
                                </h2>
                            </div>

                            <p className="text-sm text-[#17233B]/60">
                                {filteredOffers.length} promotion
                                {filteredOffers.length === 1 ? "" : "s"} found
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
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

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-sm font-medium text-[#17233B]/60">
                                Sort:
                            </span>

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

                            {(search ||
                                selectedCategory !== "All promotions" ||
                                sort !== "newest") && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </Button>
                                )}
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
                ) : isLoading ? (
                    <section className="mt-8 grid gap-6 md:grid-cols-2">
                        {[1, 2, 3, 4].map((item) => (
                            <Card
                                key={item}
                                className="h-80 animate-pulse rounded-3xl bg-white"
                            />
                        ))}
                    </section>
                ) : filteredOffers.length === 0 ? (
                    <Card className="mt-8 rounded-3xl border-dashed">
                        <CardContent className="p-10 text-center">
                            <h2 className="text-xl font-semibold">
                                No promotions found
                            </h2>

                            <p className="mt-2 text-sm text-[#17233B]/60">
                                Try another search term or reset your filters.
                            </p>

                            <Button
                                type="button"
                                variant="outline"
                                className="mt-6"
                                onClick={clearFilters}
                            >
                                Clear filters
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <section className="mt-8 grid gap-6 md:grid-cols-2">
                        {filteredOffers.map((offer) => {
                            const business = Array.isArray(offer.businesses)
                                ? offer.businesses[0]
                                : offer.businesses;

                            return (
                                <OfferCard
                                    key={offer.id}
                                    slug={offer.slug}
                                    discount={offer.discount}
                                    title={offer.title}
                                    description={offer.description}
                                    availability={offer.availability}
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