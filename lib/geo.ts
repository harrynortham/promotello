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
