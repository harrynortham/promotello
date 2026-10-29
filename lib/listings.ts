import { cacheLife } from "next/cache";

import {
    getCategoryGroups,
    isInCategory,
    topLevelFor,
    type CategoryGroup,
} from "@/lib/categories";
import { createPublicClient } from "@/utils/supabase/public";

// Public listings for the customer pages. Everything is read with the
// anonymous client, so RLS limits it to approved businesses and live
// (approved, unexpired, unpaused) offers: exactly what a visitor can see.
//
// The catalogue is small, so pages load it once (cached for a few minutes)
// and filter in memory. Move filtering into the queries once it grows.

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
    business: {
        id: string;
        slug: string;
        name: string;
        logoUrl: string | null;
        area: string | null;
        cityId: string | null;
        // One of the sample businesses that show how Promotello works.
        isSample: boolean;
    };
};

export type ListingBusiness = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    categoryId: string | null;
    categoryName: string;
    area: string | null;
    cityId: string | null;
    createdAt: string;
    offerCount: number;
    coverImageUrl: string | null;
    // One of the sample businesses that show how Promotello works.
    isSample: boolean;
    topOffer: { slug: string; title: string; discount: string } | null;
};

type LocationRow = { region: string | null; city: string | null; city_id: string | null };

function areaOf(locations: LocationRow | LocationRow[] | null) {
    const location = Array.isArray(locations) ? locations[0] : locations;
    return location?.region || location?.city || null;
}

function cityIdOf(locations: LocationRow | LocationRow[] | null) {
    const location = Array.isArray(locations) ? locations[0] : locations;
    return location?.city_id ?? null;
}

function inCity(locations: LocationRow | LocationRow[] | null, cityId: string | undefined) {
    if (!cityId) return true;
    const rows = Array.isArray(locations) ? locations : locations ? [locations] : [];
    return rows.some((location) => location.city_id === cityId);
}

function one<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getCategories(): Promise<CategoryGroup[]> {
    "use cache";
    cacheLife("hours");

    return getCategoryGroups(createPublicClient());
}

// Every live offer, or only one city's when given its id.
export async function getLiveOffers(cityId?: string): Promise<ListingOffer[]> {
    "use cache";
    cacheLife("minutes");

    const { data, error } = await createPublicClient()
        .from("offers")
        .select(
            `
                id, slug, title, discount, description, availability,
                expires_at, created_at, image_url, category, category_id,
                redemption_count, max_redemptions,
                businesses!inner (
                    id, slug, name, logo_url, is_sample,
                    business_locations ( region, city, city_id )
                )
            `,
        )
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return data.flatMap((row) => {
        const business = one(row.businesses);

        if (!business || !inCity(business.business_locations, cityId)) {
            return [];
        }

        return [
            {
                id: row.id,
                slug: row.slug,
                title: row.title,
                discount: row.discount,
                description: row.description,
                availability: row.availability,
                expiresAt: row.expires_at,
                createdAt: row.created_at,
                imageUrl: row.image_url,
                categoryId: row.category_id,
                categoryName: row.category,
                redemptionCount: row.redemption_count,
                maxRedemptions: row.max_redemptions,
                business: {
                    id: business.id,
                    slug: business.slug,
                    name: business.name,
                    logoUrl: business.logo_url,
                    area: areaOf(business.business_locations),
                    cityId: cityIdOf(business.business_locations),
                    isSample: business.is_sample,
                },
            },
        ];
    });
}

// Every approved business, or only one city's when given its id.
export async function getPublicBusinesses(cityId?: string): Promise<ListingBusiness[]> {
    "use cache";
    cacheLife("minutes");

    const { data, error } = await createPublicClient()
        .from("businesses")
        .select(
            `
                id, slug, name, description, logo_url, category, category_id, created_at, is_sample,
                business_locations ( region, city, city_id ),
                offers ( slug, title, discount, image_url, created_at )
            `,
        )
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return data.filter((row) => inCity(row.business_locations, cityId)).map((row) => {
        // RLS only returns live offers here; newest first.
        const offers = [...(row.offers ?? [])].sort((a, b) =>
            b.created_at.localeCompare(a.created_at),
        );
        const latest = offers[0] ?? null;

        return {
            id: row.id,
            slug: row.slug,
            name: row.name,
            description: row.description,
            logoUrl: row.logo_url,
            categoryId: row.category_id,
            categoryName: row.category,
            area: areaOf(row.business_locations),
            cityId: cityIdOf(row.business_locations),
            createdAt: row.created_at,
            offerCount: offers.length,
            coverImageUrl: offers.find((offer) => offer.image_url)?.image_url ?? null,
            isSample: row.is_sample,
            topOffer: latest
                ? { slug: latest.slug, title: latest.title, discount: latest.discount }
                : null,
        };
    });
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
            (!area || offer.business.area === area) &&
            (!search ||
                matchesSearch(
                    `${offer.title} ${offer.discount} ${offer.description} ${offer.business.name} ${offer.categoryName} ${offer.business.area ?? ""}`,
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
            (!area || business.area === area) &&
            (!search ||
                matchesSearch(
                    `${business.name} ${business.description ?? ""} ${business.categoryName} ${business.area ?? ""}`,
                    search,
                )),
    );
}

// Areas with at least one business, busiest first.
export function areasFrom(businesses: Pick<ListingBusiness, "area">[]) {
    const counts = new Map<string, number>();

    for (const business of businesses) {
        if (business.area) {
            counts.set(business.area, (counts.get(business.area) ?? 0) + 1);
        }
    }

    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }));
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
