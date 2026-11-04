import { cacheLife, cacheTag } from "next/cache";

import { listPlaces } from "@/lib/places";
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

// How to name "where" in copy: the city being shown, or every live city when
// no city is chosen. Always reads correctly after a preposition ("offers in
// X", "across X"). It is never a possessive, because a list cannot take
// one — copy that wants "Bristol's" asks placeIsOneCity() first.
export { listPlaces };

export async function placeName(city: City | null) {
    if (city) return city.name;
    return listPlaces((await getLiveCities()).map((item) => item.name));
}

// Whether "where" is a single place, so copy can use its name possessively
// ("Bristol's independents") instead of a list ("Bristol and Bath's").
export async function placeIsOneCity(city: City | null) {
    return Boolean(city) || (await getLiveCities()).length === 1;
}

// Photos for a city's pages. With no city chosen and only one live city,
// that city's photos are used; with several there is no one city's photo to
// borrow, so the pages fall back to Promotello's own.
export async function cityPhotosFor(city: City | null) {
    const cities = await getLiveCities();
    const place = cities.find((item) => item.id === city?.id) ?? (cities.length === 1 ? cities[0] : null);
    return cityPhotos(place);
}

// Promotello's own photos, for pages that aren't about any one city.
const sitePhotos = {
    hero: "/images/home/hero.jpg",
    heroAlt: "Independent local businesses",
    feature: "/images/home/harbourside.jpg",
    featureAlt: "Local independent businesses",
};

// A city that hasn't had photos added yet. Deliberately not Promotello's own
// photos, which are of a particular place: a stock street scene says nothing
// false about a city, a landmark from somewhere else does.
const unphotographed = {
    hero: "/images/categories/food-drink.jpg",
    feature: "/images/categories/shopping.jpg",
};

// Photos for a city's pages, with general ones for cities that have none.
export function cityPhotos(place: Pick<Place, "name" | "heroImageUrl" | "featureImageUrl"> | null) {
    if (!place) return sitePhotos;

    return {
        hero: place.heroImageUrl ?? unphotographed.hero,
        heroAlt: `Independent businesses in ${place.name}`,
        feature: place.featureImageUrl ?? unphotographed.feature,
        featureAlt: `Out and about in ${place.name}`,
    };
}
