import { cookies, headers } from "next/headers";

import { ALL_LOCATIONS, CITY_COOKIE } from "@/lib/city-cookie";
import { getLiveCities, type Place } from "@/lib/cities";
import { nearestCity } from "@/lib/geo";

export type VisitorContext = {
    // The live city to show, or null for every location.
    city: Place | null;
    // How we know: their choice, their approximate location, or nothing.
    source: "chosen" | "detected" | "default";
    // Their detected town when it's outside every live city (e.g. "London").
    outsideTown: string | null;
};

function readNumber(value: string | null) {
    const number = value === null ? NaN : Number(value);
    return Number.isFinite(number) ? number : null;
}

// Works out which city a visitor is browsing. Their choice in the location
// search wins; otherwise their approximate location from Vercel's IP
// headers is matched to the nearest live city. Nothing is stored about
// them. Locally (no Vercel headers) everyone sees every location.
export async function getVisitorContext(): Promise<VisitorContext> {
    const [cookieStore, headerStore, cities] = await Promise.all([cookies(), headers(), getLiveCities()]);

    const chosen = cookieStore.get(CITY_COOKIE)?.value;

    if (chosen === ALL_LOCATIONS) {
        return { city: null, source: "chosen", outsideTown: null };
    }

    const chosenCity = cities.find((city) => city.slug === chosen);

    if (chosenCity) {
        return { city: chosenCity, source: "chosen", outsideTown: null };
    }

    const latitude = readNumber(headerStore.get("x-vercel-ip-latitude"));
    const longitude = readNumber(headerStore.get("x-vercel-ip-longitude"));

    if (latitude === null || longitude === null) {
        return { city: null, source: "default", outsideTown: null };
    }

    const detected = nearestCity(cities, latitude, longitude);

    if (detected) {
        return { city: detected, source: "detected", outsideTown: null };
    }

    // Vercel URL-encodes the city name.
    const town = headerStore.get("x-vercel-ip-city");
    const country = headerStore.get("x-vercel-ip-country");

    return {
        city: null,
        source: "default",
        outsideTown: town && (!country || country === "GB") ? decodeURIComponent(town) : null,
    };
}
