import { cookies, headers } from "next/headers";

import { ALL_LOCATIONS, CITY_COOKIE } from "@/lib/city-cookie";
import { getLiveCities, type Place } from "@/lib/cities";
import { cityForVisitor } from "@/lib/geo";

export type VisitorContext = {
    // The live city to show, or null for every location.
    city: Place | null;
    // How we know: their choice, their approximate location, or nothing.
    source: "chosen" | "detected" | "default";
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
        return { city: null, source: "chosen" };
    }

    const chosenCity = cities.find((city) => city.slug === chosen);

    if (chosenCity) {
        return { city: chosenCity, source: "chosen" };
    }

    // Vercel URL-encodes the town name. It is only ever used to match a
    // city's own areas, never shown: on a mobile network the address it is
    // derived from belongs to the carrier's gateway, so it can name a town
    // at the other end of the country.
    const rawTown = headerStore.get("x-vercel-ip-city");
    const town = rawTown ? decodeURIComponent(rawTown) : null;

    const detected = cityForVisitor(
        cities,
        town,
        readNumber(headerStore.get("x-vercel-ip-latitude")),
        readNumber(headerStore.get("x-vercel-ip-longitude")),
    );

    if (detected) {
        return { city: detected, source: "detected" };
    }

    return { city: null, source: "default" };
}
