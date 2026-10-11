"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function loadOffers() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading offers:", error);
        return;
      }

      setOffers(data ?? []);
    }

    loadOffers();
  }, []);

  const filteredOffers =
    selectedCategory === "All deals"
      ? offers
      : offers.filter((offer) => offer.category === selectedCategory);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-[#FFF8F0]">
      <header className="flex w-full max-w-5xl items-center justify-between px-2 py-2">
        <Image
          src="/brand/promotello-horizontal-primary.svg"
          alt="Promotello"
          width={168}
          height={45}
          priority
        />

        <Button
          size="sm"
          variant="outline"
          render={<Link href="#offers" />}
          nativeButton={false}
        >
          Browse deals
        </Button>
      </header>

      <section className="flex w-full max-w-md flex-col items-center gap-8 py-20 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[#17233B]">
            Save on the places you love.
          </h1>

          <p className="text-base leading-7 text-[#17233B]/70">
            Discover local deals and enjoy more for less.
          </p>

          <Button
            render={<Link href="#offers" />}
            nativeButton={false}
            size="lg"
          >
            Explore deals
          </Button>
        </div>
      </section>

      <section id="offers" className="w-full max-w-5xl px-6 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-[#17233B]">
            Explore local deals
          </h2>

          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                size="sm"
                variant={
                  selectedCategory === category ? "default" : "outline"
                }
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "rounded-full bg-[#FF593F] text-[#17233B] hover:bg-[#e94d36]"
                    : "rounded-full border-[#17233B]/20 text-[#17233B] hover:bg-[#17233B]/5"
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {filteredOffers.length > 0 ? (
            filteredOffers.map((offer) => (
              <OfferCard key={offer.slug} {...offer} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#17233B]/20 p-8 text-center md:col-span-2">
              <p className="font-medium text-[#17233B]">
                No offers in this category yet.
              </p>

              <p className="mt-2 text-sm text-[#17233B]/60">
                Check back soon for new local deals.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="mt-auto flex w-full max-w-5xl flex-col gap-3 border-t border-[#17233B]/10 px-6 py-8 text-sm text-[#17233B]/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Promotello</p>

        <nav className="flex gap-5">
          <a href="#" className="hover:text-[#17233B]">
            Privacy
          </a>

          <a href="#" className="hover:text-[#17233B]">
            Terms
          </a>
        </nav>
      </footer>
    </main>
  );
}