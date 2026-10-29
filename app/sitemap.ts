import { businessPath } from "@/lib/slugs";
import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";

import { blogCategories } from "@/keystatic.config";
import { getPosts } from "@/lib/blog";
import { areaPath, getLiveCities } from "@/lib/cities";
import { filterBusinesses, filterOffers, getCategories, getLiveOffers, getPublicBusinesses } from "@/lib/listings";
import { EVENTS_ENABLED } from "@/lib/features";

import { absoluteUrl } from "@/lib/site";
import { createPublicClient } from "@/utils/supabase/public";

const staticPaths = [
    "/",
    "/offers",
    "/businesses",
    "/explore",
    "/categories",
    "/categories/food-drink",
    "/categories/things-to-do",
    "/categories/shopping",
    "/categories/health-beauty",
    "/categories/services",
    "/categories/travel-stays",
    "/about",
    "/help",
    "/contact",
    "/business",
    ...(EVENTS_ENABLED ? ["/events"] : []),
    "/business/features",
    "/business/pricing",
    "/business/demo",
    "/business/why-promotello",
    "/business/how-it-works",
    "/business/getting-started",
    "/business/faq",
    "/business/about",
    "/business/help",
    "/business/contact",
    "/legal/terms",
    "/legal/privacy",
    "/legal/cookies",
    "/legal/refunds",
];

// Each live city also has its own version of the listing pages.
const categorySlugs = ["food-drink", "things-to-do", "shopping", "health-beauty", "services", "travel-stays"];

function cityPaths(slug: string) {
    return [
        `/offers/${slug}`,
        `/businesses/${slug}`,
        `/explore/${slug}`,
        ...categorySlugs.map((category) => `/categories/${category}/${slug}`),
    ];
}

// Cached for an hour once generated, but only ever generated at request
// time, so building the app never needs a database connection.
async function getPublicListings() {
    "use cache";
    cacheLife("hours");

    const supabase = createPublicClient();

    // RLS limits both queries to what an anonymous visitor can see:
    // approved businesses, and approved, unexpired, unpaused offers.
    // Sample (demo) listings are left out so search engines never index them.
    const [{ data: businesses }, { data: offers }] = await Promise.all([
        supabase.from("businesses").select("slug, updated_at").eq("is_sample", false),
        supabase
            .from("offers")
            .select("slug, updated_at, businesses!inner ( is_sample )")
            .eq("businesses.is_sample", false),
    ]);

    return { businesses, offers };
}

// Area pages and subcategory pages, only where there's something to show:
// empty ones are noindex.
async function landingPaths() {
    const [cities, groups, offers, businesses] = await Promise.all([
        getLiveCities(),
        getCategories(),
        getLiveOffers(),
        getPublicBusinesses(),
    ]);

    const hasContent = (slug: string, cityId?: string) =>
        filterOffers(offers.filter((offer) => !cityId || offer.business.cityId === cityId), groups, { category: slug }).length > 0 ||
        filterBusinesses(businesses.filter((business) => !cityId || business.cityId === cityId), groups, { category: slug }).length > 0;

    const subcategories = groups.flatMap((group) => group.subcategories.map((sub) => sub.slug));

    return [
        ...subcategories.filter((slug) => hasContent(slug)).map((slug) => `/categories/${slug}`),
        ...cities.flatMap((city) => [
            ...subcategories.filter((slug) => hasContent(slug, city.id)).map((slug) => `/categories/${slug}/${city.slug}`),
            ...city.areas
                .filter((area) => businesses.some((business) => business.cityId === city.id && business.area === area))
                .map((area) => areaPath(city, area))
                .filter((path): path is string => path !== null),
        ]),
    ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    await connection();

    const [{ businesses, offers }, cities, landings, posts] = await Promise.all([
        getPublicListings(),
        getLiveCities(),
        landingPaths(),
        getPosts(),
    ]);

    return [
        { url: absoluteUrl("/blog"), changeFrequency: "weekly" as const, priority: 0.7 },
        ...blogCategories.map((category) => ({
            url: absoluteUrl(`/blog/category/${category.value}`),
            changeFrequency: "weekly" as const,
            priority: 0.5,
        })),
        ...posts.map((post) => ({
            url: absoluteUrl(`/blog/${post.slug}`),
            lastModified: post.updatedAt ?? post.publishedAt,
            changeFrequency: "monthly" as const,
            priority: 0.8,
        })),
        ...landings.map((path) => ({
            url: absoluteUrl(path),
            changeFrequency: "weekly" as const,
            priority: 0.6,
        })),
        ...cities.flatMap((city) =>
            cityPaths(city.slug).map((path) => ({
                url: absoluteUrl(path),
                changeFrequency: "weekly" as const,
                priority: 0.6,
            })),
        ),
        ...staticPaths.map((path) => ({
            url: absoluteUrl(path),
            changeFrequency: "weekly" as const,
            priority: path === "/" ? 1 : 0.5,
        })),
        ...(businesses ?? []).map((business) => ({
            url: absoluteUrl(businessPath(business)),
            lastModified: business.updated_at,
            changeFrequency: "weekly" as const,
            priority: 0.8,
        })),
        ...(offers ?? []).map((offer) => ({
            url: absoluteUrl(`/offers/${offer.slug}`),
            lastModified: offer.updated_at,
            changeFrequency: "daily" as const,
            priority: 0.7,
        })),
    ];
}
