import { isInCategory, topLevelFor, type CategoryGroup } from "@/lib/categories";

// Shapes, grouping and filtering for the public listings. Kept apart from
// lib/listings.ts, which fetches them, so this file imports nothing from
// Next.js or Supabase and can be unit tested on its own
// (tests/unit/listing-filters.test.ts).

export type ListingPlace = {
    area: string | null;
    areaId: string | null;
    city: string | null;
    cityId: string | null;
};

export type ListingOffer = {
    id: string;
    slug: string;
    title: string;
    discount: string;
    description: string;
    availability: string;
    expiresAt: string;
    createdAt: string;
    imageUrl: string | null;
    categoryId: string | null;
    categoryName: string;
    redemptionCount: number;
    maxRedemptions: number | null;
    business: ListingPlace & {
        id: string;
        slug: string;
        name: string;
        logoUrl: string | null;
        // One of the sample businesses that show how Promotello works.
        isSample: boolean;
    };
};

export type ListingBusiness = ListingPlace & {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    categoryId: string | null;
    categoryName: string;
    createdAt: string;
    offerCount: number;
    coverImageUrl: string | null;
    // One of the sample businesses that show how Promotello works.
    isSample: boolean;
    topOffer: { slug: string; title: string; discount: string } | null;
};

export type LocationRow = {
    region: string | null;
    city: string | null;
    city_id: string | null;
    area_id: string | null;
};

// A business can have several locations; its first one is the one shown.
export function placeOf(locations: LocationRow | LocationRow[] | null): ListingPlace {
    const location = Array.isArray(locations) ? locations[0] : locations;

    return {
        area: location?.region || location?.city || null,
        areaId: location?.area_id ?? null,
        city: location?.city ?? null,
        cityId: location?.city_id ?? null,
    };
}

// ---------------------------------------------------------------------------
// Filtering and sorting
// ---------------------------------------------------------------------------

export type OfferSort = "newest" | "ending-soon" | "popular";

export function parseOfferSort(value: string | undefined): OfferSort {
    return value === "ending-soon" || value === "popular" ? value : "newest";
}

function matchesSearch(text: string, search: string) {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = text.toLowerCase();
    return words.every((word) => haystack.includes(word));
}

export function filterOffers(
    offers: ListingOffer[],
    groups: CategoryGroup[],
    { category, area, search, sort = "newest" }: {
        category?: string;
        area?: string;
        search?: string;
        sort?: OfferSort;
    },
) {
    const filtered = offers.filter(
        (offer) =>
            (!category || isInCategory(offer.categoryId, category, groups)) &&
            inArea(offer.business, area) &&
            (!search ||
                matchesSearch(
                    `${offer.title} ${offer.discount} ${offer.description} ${offer.business.name} ${offer.categoryName} ${offer.business.area ?? ""} ${offer.business.city ?? ""}`,
                    search,
                )),
    );

    return filtered.sort((a, b) => {
        if (sort === "ending-soon") {
            return a.expiresAt.localeCompare(b.expiresAt);
        }

        if (sort === "popular") {
            return b.redemptionCount - a.redemptionCount || b.createdAt.localeCompare(a.createdAt);
        }

        return b.createdAt.localeCompare(a.createdAt);
    });
}

export function filterBusinesses(
    businesses: ListingBusiness[],
    groups: CategoryGroup[],
    { category, area, search }: { category?: string; area?: string; search?: string },
) {
    return businesses.filter(
        (business) =>
            (!category || isInCategory(business.categoryId, category, groups)) &&
            inArea(business, area) &&
            (!search ||
                matchesSearch(
                    `${business.name} ${business.description ?? ""} ${business.categoryName} ${business.area ?? ""} ${business.city ?? ""}`,
                    search,
                )),
    );
}

export type ListingArea = {
    // Null only for a location saved before areas had ids.
    id: string | null;
    name: string;
    cityId: string | null;
    cityName: string | null;
    count: number;
};

// Areas with at least one business, busiest first. Grouped by area id, so
// Bristol's City Centre and Bath's stay two separate areas rather than
// being added together under one name.
export function areasFrom(places: ListingPlace[]): ListingArea[] {
    const areas = new Map<string, ListingArea>();

    for (const place of places) {
        if (!place.area) continue;

        // Locations saved before areas had ids fall back to the name, which
        // is still unique inside one city.
        const key = place.areaId ?? `${place.cityId ?? ""}:${place.area}`;
        const found = areas.get(key);

        if (found) {
            found.count += 1;
        } else {
            areas.set(key, {
                id: place.areaId,
                name: place.area,
                cityId: place.cityId,
                cityName: place.city,
                count: 1,
            });
        }
    }

    return [...areas.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// Whether a listing is in this exact area. Matched on the area's id so two
// cities' "City Centre" stay apart; locations saved before areas had ids
// fall back to the name within the same city.
export function isInArea(place: ListingPlace, area: ListingArea) {
    return area.id && place.areaId
        ? place.areaId === area.id
        : place.area === area.name && place.cityId === area.cityId;
}

// Whether a listing is in the area the visitor picked. Areas are filtered by
// name because that is what the address bar carries (?area=Clifton), which
// only works once the listings have been narrowed to one city — so callers
// showing every city send people to the city's own page first.
export function inArea(place: ListingPlace, area: string | undefined) {
    return !area || place.area === area;
}

// The live cities an area name belongs to. Used to send a bare
// /offers?area=Clifton to the city that owns Clifton.
export function citiesWithArea(places: ListingPlace[], area: string) {
    return [...new Set(places.filter((place) => place.area === area).map((place) => place.cityId))]
        .filter((cityId): cityId is string => cityId !== null);
}

// Takes one listing from each city in turn, keeping each city's own order.
//
// Everything is newest-first, so a list spanning several cities is otherwise
// filled by whichever city joined most recently: three cities live, and the
// newest one owns the whole first screen. Nobody outside that city is served
// by that.
//
// Only for lists that span cities. One city, or an explicit sort the visitor
// asked for, is left exactly as it is.
export function interleaveByCity<T>(items: T[], cityOf: (item: T) => string | null): T[] {
    const cities = new Map<string, T[]>();

    for (const item of items) {
        const key = cityOf(item) ?? "";
        const found = cities.get(key);

        if (found) {
            found.push(item);
        } else {
            cities.set(key, [item]);
        }
    }

    if (cities.size < 2) return items;

    const queues = [...cities.values()];
    const longest = Math.max(...queues.map((queue) => queue.length));
    const mixed: T[] = [];

    for (let index = 0; index < longest; index++) {
        for (const queue of queues) {
            if (index < queue.length) mixed.push(queue[index]);
        }
    }

    return mixed;
}

// A picture to stand for a neighbourhood, taken from a business that is in
// it. Without one, every area page falls back to the city's own photo and
// they all look identical.
//
// The longest-standing business is used rather than the newest, so the
// backdrop doesn't change each time someone new joins the street.
// ListingBusiness.coverImageUrl already falls back to a business's newest
// offer photo, so this finds one whether or not covers have been uploaded.
export function areaPhoto(businesses: ListingBusiness[]) {
    return [...businesses]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .find((business) => business.coverImageUrl)?.coverImageUrl ?? null;
}

// Live offer count per top-level category slug.
export function offerCountsByCategory(offers: ListingOffer[], groups: CategoryGroup[]) {
    const counts: Record<string, number> = {};

    for (const offer of offers) {
        const group = topLevelFor(offer.categoryId, groups);

        if (group) {
            counts[group.slug] = (counts[group.slug] ?? 0) + 1;
        }
    }

    return counts;
}

export function categoryImage(group: Pick<CategoryGroup, "slug" | "image_url">) {
    return group.image_url ?? `/images/categories/${group.slug}.jpg`;
}
