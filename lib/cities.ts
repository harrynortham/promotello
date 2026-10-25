import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/utils/supabase/public";

// Live cities for the customer pages. Listing pages show every live city
// by default, and one city when it's added to the URL: /offers/bristol,
// /businesses/bristol, /explore/bristol, /categories/<category>/bristol.

export type City = { id: string; slug: string; name: string };

export type Place = City & {
    areas: string[];
    // Area name to its slug, for /explore/<city>/<area>.
    areaSlugs: Record<string, string>;
    latitude: number | null;
    longitude: number | null;
    radiusKm: number;
    heroImageUrl: string | null;
    featureImageUrl: string | null;
};

export async function getLiveCities(): Promise<Place[]> {
    "use cache";
    cacheLife("minutes");
    cacheTag("cities");

    const { data } = await createPublicClient()
        .from("cities")
        .select("id, slug, name, latitude, longitude, radius_km, hero_image_url, feature_image_url, areas ( name, slug, is_active )")
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
        areaSlugs: Object.fromEntries(
            (city.areas ?? []).filter((area) => area.is_active).map((area) => [area.name, area.slug]),
        ),
        latitude: city.latitude,
        longitude: city.longitude,
        radiusKm: city.radius_km,
        heroImageUrl: city.hero_image_url,
        featureImageUrl: city.feature_image_url,
    }));
}

export async function getLiveCity(slug: string): Promise<City | null> {
    const city = (await getLiveCities()).find((item) => item.slug === slug);
    return city ? { id: city.id, slug: city.slug, name: city.name } : null;
}

// An area's own page, e.g. /explore/bristol/gloucester-road.
export function areaPath(place: Pick<Place, "slug" | "areaSlugs">, areaName: string) {
    // areaSlugs can be missing from city data cached before it existed.
    const slug = place.areaSlugs?.[areaName];
    return slug ? `/explore/${place.slug}/${slug}` : null;
}

// How to name "where" in copy: the city, or the only live city, or a
// general phrase once there are several.
export async function placeName(city: City | null) {
    if (city) return city.name;
    const cities = await getLiveCities();
    return cities.length === 1 ? cities[0].name : "your area";
}

// Photos for a city's pages. With no city chosen and only one live city,
// that city's photos are used.
export async function cityPhotosFor(city: City | null) {
    const cities = await getLiveCities();
    const place = cities.find((item) => item.id === city?.id) ?? (cities.length === 1 ? cities[0] : null);
    return cityPhotos(place);
}

// Photos for a city's pages, with general ones for cities that have none.
export function cityPhotos(place: Pick<Place, "name" | "heroImageUrl" | "featureImageUrl"> | null) {
    return {
        hero: place?.heroImageUrl ?? "/images/categories/food-drink.jpg",
        heroAlt: place ? `Independent businesses in ${place.name}` : "Independent local businesses",
        feature: place?.featureImageUrl ?? "/images/categories/shopping.jpg",
        featureAlt: place ? `Out and about in ${place.name}` : "Shopping locally",
    };
}
