import { cacheLife } from "next/cache";

import { getCategoryGroups, type CategoryGroup } from "@/lib/categories";
import { placeOf, type ListingBusiness, type ListingOffer, type LocationRow } from "@/lib/listing-filters";
import { createPublicClient } from "@/utils/supabase/public";

// Public listings for the customer pages. Everything is read with the
// anonymous client, so RLS limits it to approved businesses and live
// (approved, unexpired, unpaused) offers: exactly what a visitor can see.
//
// The catalogue is small, so pages load it once (cached for a few minutes)
// and filter in memory. Move filtering into the queries once it grows.
//
// The shapes, and everything that groups or filters them, are in
// lib/listing-filters.ts and re-exported here.
export * from "@/lib/listing-filters";

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
                    business_locations ( region, city, city_id, area_id )
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
                    ...placeOf(business.business_locations),
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
                id, slug, name, description, logo_url, cover_image_url, category, category_id, created_at, is_sample,
                business_locations ( region, city, city_id, area_id ),
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
            ...placeOf(row.business_locations),
            createdAt: row.created_at,
            offerCount: offers.length,
            // Its own cover photo, or else its newest offer photo.
            coverImageUrl: row.cover_image_url ?? offers.find((offer) => offer.image_url)?.image_url ?? null,
            isSample: row.is_sample,
            topOffer: latest
                ? { slug: latest.slug, title: latest.title, discount: latest.discount }
                : null,
        };
    });
}
