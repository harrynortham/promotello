import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { createPublicClient } from "@/utils/supabase/public";

// Live cities for the customer pages, which live under /<city-slug>/…
// (e.g. /bristol/offers). Offer and business pages keep their own URLs.

export type City = { id: string; slug: string; name: string };

export async function getLiveCities(): Promise<City[]> {
    "use cache";
    cacheLife("minutes");

    const { data } = await createPublicClient()
        .from("cities")
        .select("id, slug, name")
        .eq("is_live", true)
        .order("name");

    return data ?? [];
}

export async function getLiveCity(slug: string) {
    return (await getLiveCities()).find((city) => city.slug === slug) ?? null;
}

// The city to send someone to: their remembered one if it's live, else
// the first live city.
export async function preferredCity(rememberedSlug: string | undefined) {
    const cities = await getLiveCities();
    return cities.find((city) => city.slug === rememberedSlug) ?? cities[0] ?? null;
}

export function cityPath(city: Pick<City, "slug">, path = "") {
    return `/${city.slug}${path}`;
}

// For pages under /[city]: the live city in the URL, or a 404.
export async function requireCity(params: Promise<{ city: string }>) {
    const city = await getLiveCity((await params).city);

    if (!city) {
        notFound();
    }

    return city;
}

// Photos for a city's pages; cities without their own use a general one.
const cityPhotos: Record<string, { hero: string; heroAlt: string; feature: string; featureAlt: string }> = {
    bristol: {
        hero: "/images/home/hero.jpg",
        heroAlt: "Clifton Suspension Bridge over the Avon Gorge",
        feature: "/images/home/harbourside.jpg",
        featureAlt: "Bikes parked beside Bristol's harbour",
    },
};

export function cityPhotosFor(city: Pick<City, "slug" | "name">) {
    return (
        cityPhotos[city.slug] ?? {
            hero: "/images/categories/food-drink.jpg",
            heroAlt: `Independent businesses in ${city.name}`,
            feature: "/images/categories/shopping.jpg",
            featureAlt: `Shopping locally in ${city.name}`,
        }
    );
}
