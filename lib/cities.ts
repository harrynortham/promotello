import { cacheLife } from "next/cache";

import { createPublicClient } from "@/utils/supabase/public";

// Live cities for the customer pages. Listing pages show every live city
// by default, and one city when it's added to the URL: /offers/bristol,
// /businesses/bristol, /explore/bristol, /categories/<category>/bristol.

export type City = { id: string; slug: string; name: string };

export type Place = City & { areas: string[] };

export async function getLiveCities(): Promise<Place[]> {
    "use cache";
    cacheLife("minutes");

    const { data } = await createPublicClient()
        .from("cities")
        .select("id, slug, name, areas ( name, is_active )")
        .eq("is_live", true)
        .order("name");

    return (data ?? []).map((city) => ({
        id: city.id,
        slug: city.slug,
        name: city.name,
        areas: (city.areas ?? [])
            .filter((area) => area.is_active)
            .map((area) => area.name)
            .sort((a, b) => a.localeCompare(b)),
    }));
}

export async function getLiveCity(slug: string): Promise<City | null> {
    const city = (await getLiveCities()).find((item) => item.slug === slug);
    return city ? { id: city.id, slug: city.slug, name: city.name } : null;
}

// How to name "where" in copy: the city, or the only live city, or a
// general phrase once there are several.
export async function placeName(city: City | null) {
    if (city) return city.name;
    const cities = await getLiveCities();
    return cities.length === 1 ? cities[0].name : "your area";
}
