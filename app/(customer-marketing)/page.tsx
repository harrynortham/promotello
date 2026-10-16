"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { OfferCard } from "@/components/offer-card";
import { createClient } from "@/utils/supabase/client";
import type { Offer } from "@/lib/offers";

const categories = [
  "All deals",
  "Food & drink",
  "Things to do",
  "Shopping",
];

function LoadingCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <Card
          key={item}
          className="h-64 animate-pulse border-[#17233B]/10 bg-[#17233B]/5 shadow-none"
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState("All deals");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
            terms,
            image_url,
            business_id,
            businesses!inner (
              name,
              logo_url,
              approval_status
            )
          `,
        )
        .eq("approval_status", "approved")
        .eq("businesses.approval_status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading offers:", error);
        setIsLoading(false);
        return;
      }

      const formattedOffers: Offer[] = (data ?? []).map((offer) => {
        const business = Array.isArray(offer.businesses)
          ? offer.businesses[0]
          : offer.businesses;

        return {
          id: offer.id,
          slug: offer.slug,
          category: offer.category,
          discount: offer.discount,
          title: offer.title,
          description: offer.description,
          availability: offer.availability,
          business: business?.name ?? "Local business",
          businessId: offer.business_id,
          businessLogoUrl: business?.logo_url ?? null,
          imageUrl: offer.image_url ?? null,
          expiresAt: offer.expires_at,
          terms: offer.terms,
        };
      });

      setOffers(formattedOffers);
      setIsLoading(false);
    }

    loadOffers();
  }, []);

  const filteredOffers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return offers.filter((offer) => {
      const matchesCategory =
        selectedCategory === "All deals" ||
        offer.category?.toLowerCase() ===
        selectedCategory.toLowerCase();

      const matchesSearch =
        !query ||
        offer.title.toLowerCase().includes(query) ||
        offer.description?.toLowerCase().includes(query) ||
        offer.business.toLowerCase().includes(query) ||
        offer.category?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [offers, selectedCategory, searchQuery]);

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategory("All deals");
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-[#17233B]">
      <section className="bg-[#FFF4E8]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-20 text-center md:py-28">
          <Badge
            variant="outline"
            className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
          >
            Local deals, made easy
          </Badge>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            Save on the places you love.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-[#17233B]/70 md:text-lg">
            Discover great local offers, support independent businesses, and
            enjoy more for less.
          </p>

          <Button
            render={<Link href="#offers" />}
            nativeButton={false}
            size="lg"
            variant="default"
            className="mt-8"
          >
            Explore deals
          </Button>
        </div>
      </section>

      <section
        id="offers"
        className="mx-auto w-full max-w-6xl px-6 py-16"
      >
        <Card className="border-[#17233B]/10 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge
                  variant="outline"
                  className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                >
                  Discover something new
                </Badge>

                <CardTitle className="mt-2 text-3xl tracking-tight">
                  Explore local deals
                </CardTitle>
              </div>

              <p className="text-sm text-[#17233B]/60">
                {filteredOffers.length}{" "}
                {filteredOffers.length === 1 ? "deal" : "deals"} available
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-5">
              <Input
                id="offer-search"
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Search deals, businesses or categories..."
              />

              <div className="flex flex-wrap gap-3">
                {categories.map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={
                      selectedCategory === category
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>

              <Separator />

              {isLoading ? (
                <LoadingCards />
              ) : filteredOffers.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {filteredOffers.map((offer) => (
                    <OfferCard
                      key={offer.slug}
                      slug={offer.slug}
                      discount={offer.discount}
                      title={offer.title}
                      description={offer.description}
                      availability={offer.availability}
                      business={offer.business}
                      businessId={offer.businessId}
                      businessLogoUrl={offer.businessLogoUrl}
                      imageUrl={offer.imageUrl}
                      expiresAt={offer.expiresAt}
                    />
                  ))}
                </div>
              ) : (
                <Alert className="border-[#17233B]/10 bg-white">
                  <AlertTitle>
                    {searchQuery
                      ? "No deals match your search."
                      : "No offers in this category yet."}
                  </AlertTitle>

                  <AlertDescription>
                    Try another search or check back soon for new local deals.
                  </AlertDescription>

                  {(searchQuery ||
                    selectedCategory !== "All deals") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-5"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    )}
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}