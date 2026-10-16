"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/client";

type Business = {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    logo_url: string | null;
    city: string | null;
    activeOffers: number;
};

function LoadingState() {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
                <Card key={item} className="overflow-hidden rounded-3xl">
                    <Skeleton className="h-48 w-full" />

                    <CardContent className="space-y-3 p-6">
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function BusinessesPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadBusinesses() {
            const supabase = createClient();

            const { data: businessRows, error: businessError } =
                await supabase
                    .from("businesses")
                    .select(
                        `
                            id,
                            name,
                            category,
                            description,
                            logo_url
                        `,
                    )
                    .eq("approval_status", "approved")
                    .order("name", { ascending: true });

            if (businessError) {
                console.error(businessError);
                setErrorMessage(
                    "We couldn’t load businesses right now. Please try again.",
                );
                setIsLoading(false);
                return;
            }

            const businessIds = (businessRows ?? []).map(
                (business) => business.id,
            );

            const { data: locations } = businessIds.length
                ? await supabase
                    .from("business_locations")
                    .select("business_id, city")
                    .in("business_id", businessIds)
                : { data: [] };

            const { data: offers } = businessIds.length
                ? await supabase
                    .from("offers")
                    .select("business_id")
                    .in("business_id", businessIds)
                    .eq("approval_status", "approved")
                    .gte(
                        "expires_at",
                        new Date().toISOString().slice(0, 10),
                    )
                : { data: [] };

            const offerCounts = new Map<string, number>();

            for (const offer of offers ?? []) {
                offerCounts.set(
                    offer.business_id,
                    (offerCounts.get(offer.business_id) ?? 0) + 1,
                );
            }

            const cityByBusiness = new Map<string, string>();

            for (const location of locations ?? []) {
                if (location.city) {
                    cityByBusiness.set(location.business_id, location.city);
                }
            }

            const formattedBusinesses: Business[] = (businessRows ?? []).map(
                (business) => ({
                    id: business.id,
                    name: business.name,
                    category: business.category,
                    description: business.description,
                    logo_url: business.logo_url,
                    city: cityByBusiness.get(business.id) ?? null,
                    activeOffers: offerCounts.get(business.id) ?? 0,
                }),
            );

            setBusinesses(formattedBusinesses);
            setIsLoading(false);
        }

        loadBusinesses();
    }, []);

    const filteredBusinesses = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) {
            return businesses;
        }

        return businesses.filter((business) => {
            return (
                business.name.toLowerCase().includes(normalizedSearch) ||
                business.category
                    ?.toLowerCase()
                    .includes(normalizedSearch) ||
                business.city?.toLowerCase().includes(normalizedSearch) ||
                business.description
                    ?.toLowerCase()
                    .includes(normalizedSearch)
            );
        });
    }, [businesses, search]);

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-7xl">
                <section className="mx-auto max-w-3xl text-center">
                    <Badge className="bg-[#FF593F] text-[#17233B] hover:bg-[#FF593F]">
                        Local businesses
                    </Badge>

                    <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                        Discover businesses near you.
                    </h1>

                    <p className="mt-5 text-lg leading-8 text-[#17233B]/65">
                        Explore local businesses, find new places to visit, and
                        discover promotions made for you.
                    </p>

                    <div className="mt-8">
                        <Input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search businesses, categories, or locations..."
                            className="h-12 bg-white"
                        />
                    </div>
                </section>

                {errorMessage ? (
                    <Alert variant="destructive" className="mt-10">
                        <AlertTitle>Unable to load businesses</AlertTitle>

                        <AlertDescription>
                            {errorMessage}
                        </AlertDescription>
                    </Alert>
                ) : isLoading ? (
                    <div className="mt-12">
                        <LoadingState />
                    </div>
                ) : filteredBusinesses.length === 0 ? (
                    <Card className="mt-12 rounded-3xl border-dashed">
                        <CardContent className="p-10 text-center">
                            <h2 className="text-xl font-semibold">
                                No businesses found
                            </h2>

                            <p className="mt-2 text-sm text-[#17233B]/60">
                                Try searching for a different business,
                                category, or location.
                            </p>

                            <Button
                                type="button"
                                variant="outline"
                                className="mt-6"
                                onClick={() => setSearch("")}
                            >
                                Clear search
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredBusinesses.map((business) => (
                            <Card
                                key={business.id}
                                className="group flex h-full flex-col overflow-hidden rounded-3xl border-[#17233B]/10 transition-all hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="flex h-48 items-center justify-center bg-[#17233B]/5">
                                    {business.logo_url ? (
                                        <Image
                                            src={business.logo_url}
                                            alt={`${business.name} logo`}
                                            width={180}
                                            height={120}
                                            className="max-h-28 w-auto object-contain"
                                        />
                                    ) : (
                                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#17233B] text-3xl font-semibold text-white">
                                            {business.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-xl">
                                                {business.name}
                                            </CardTitle>

                                            {business.category && (
                                                <Badge
                                                    variant="secondary"
                                                    className="mt-3"
                                                >
                                                    {business.category}
                                                </Badge>
                                            )}
                                        </div>

                                        {business.activeOffers > 0 && (
                                            <span className="shrink-0 text-xs font-semibold text-[#FF593F]">
                                                {business.activeOffers}{" "}
                                                {business.activeOffers === 1
                                                    ? "deal"
                                                    : "deals"}
                                            </span>
                                        )}
                                    </div>

                                    <CardDescription className="line-clamp-3 leading-6">
                                        {business.description ||
                                            "Discover local promotions and experiences from this business."}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="mt-auto">
                                    {business.city && (
                                        <p className="mb-4 text-sm text-[#17233B]/55">
                                            {business.city}
                                        </p>
                                    )}

                                    <Button
                                        render={
                                            <Link
                                                href={`/businesses/${business.id}`}
                                            />
                                        }
                                        nativeButton={false}
                                        className="w-full"
                                    >
                                        View business
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}