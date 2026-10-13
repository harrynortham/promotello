"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { OfferCard } from "@/components/offer-card";
import { createClient } from "@/utils/supabase/client";
import type { Offer } from "@/lib/offers";

const categories = [
  "All deals",
  "Food & drink",
  "Things to do",
  "Shopping",
];

export default function Home() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All deals");
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
            business_id,
            businesses!inner (
              name,
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
        offer.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSearch =
        !query ||
        offer.title.toLowerCase().includes(query) ||
        offer.description?.toLowerCase().includes(query) ||
        offer.business.toLowerCase().includes(query) ||
        offer.category?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [offers, selectedCategory, searchQuery]);

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-[#17233B]">
      <section className=" bg-[#FFF4E8]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-20 text-center md:py-28">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#FF593F]">
            Local deals, made easy
          </p>

          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
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

      <section id="offers" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#FF593F]">
                Discover something new
              </p>

              <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                Explore local deals
              </h2>
            </div>

            <p className="text-sm text-[#17233B]/60">
              {filteredOffers.length}{" "}
              {filteredOffers.length === 1 ? "deal" : "deals"} available
            </p>
          </div>

          <div className="mt-6">
            <label htmlFor="offer-search" className="sr-only">
              Search offers
            </label>

            <input
              id="offer-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search deals, businesses or categories..."
              className="w-full rounded-2xl border border-[#17233B]/15 bg-white px-5 py-3 text-sm outline-none transition focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                size="sm"
                variant={
                  selectedCategory === category ? "default" : "outline"
                }
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl bg-[#17233B]/5"
              />
            ))}
          </div>
        ) : filteredOffers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredOffers.map((offer) => (
              <OfferCard key={offer.slug} {...offer} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#17233B]/20 bg-white p-10 text-center">
            <p className="font-medium">
              {searchQuery
                ? "No deals match your search."
                : "No offers in this category yet."}
            </p>

            <p className="mt-2 text-sm text-[#17233B]/60">
              Try another search or check back soon for new local deals.
            </p>

            {(searchQuery || selectedCategory !== "All deals") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All deals");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}