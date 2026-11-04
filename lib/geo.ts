// Distance and nearest-city helpers, safe for the browser and the server.

export type CityArea = { slug: string; name: string; latitude: number | null; longitude: number | null; radiusKm: number };

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const rad = Math.PI / 180;
    const dLat = (bLat - aLat) * rad;
    const dLng = (bLng - aLng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// The nearest city whose radius covers the point, or null.
export function nearestCity<T extends CityArea>(cities: T[], latitude: number, longitude: number): T | null {
    let best: { city: T; distance: number } | null = null;

    for (const city of cities) {
        if (city.latitude === null || city.longitude === null) continue;

        const distance = distanceKm(latitude, longitude, city.latitude, city.longitude);

        if (distance <= city.radiusKm && (!best || distance < best.distance)) {
            best = { city, distance };
        }
    }

    return best?.city ?? null;
}

// The live cities that have an area of this name.
export function citiesWithTown<T extends { areas: string[] }>(cities: T[], town: string): T[] {
    const wanted = town.trim().toLowerCase();

    if (!wanted) return [];

    return cities.filter((city) => city.areas.some((area) => area.toLowerCase() === wanted));
}

// How far outside its own radius a town match is still believed. Area names
// repeat around the country — there is a Weston near Bath and a Weston in
// Lincolnshire — so a match that is nowhere near the city is ignored.
const TOWN_MATCH_SLACK = 2;

// The city a visitor is in, from the town their IP resolves to and their
// approximate position. Either may be missing.
//
// The town name is tried first, and only when exactly one live city has an
// area of that name: a town can be nearer one city's centre and belong to
// another. Keynsham is 8km from Bristol and 10km from Bath, but it is one of
// Bath's areas and its businesses are filed under Bath, so a visitor standing
// in Keynsham should be shown Bath.
export function cityForVisitor<T extends CityArea & { areas: string[] }>(
    cities: T[],
    town: string | null,
    latitude: number | null,
    longitude: number | null,
): T | null {
    const named = town ? citiesWithTown(cities, town) : [];

    if (named.length === 1) {
        const city = named[0];
        const known = latitude !== null && longitude !== null && city.latitude !== null && city.longitude !== null;
        const far = known
            && distanceKm(latitude, longitude, city.latitude!, city.longitude!) > city.radiusKm * TOWN_MATCH_SLACK;

        if (!far) return city;
    }

    if (latitude === null || longitude === null) return null;

    return nearestCity(cities, latitude, longitude);
}
