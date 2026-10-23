import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";

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
    "/events",
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
    "/business/product",
    "/business/testimonials",
    "/legal/terms",
    "/legal/privacy",
    "/legal/cookies",
];

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
        supabase.from("businesses").select("id, updated_at").eq("is_sample", false),
        supabase
            .from("offers")
            .select("slug, updated_at, businesses!inner ( is_sample )")
            .eq("businesses.is_sample", false),
    ]);

    return { businesses, offers };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    await connection();

    const { businesses, offers } = await getPublicListings();

    return [
        ...staticPaths.map((path) => ({
            url: absoluteUrl(path),
            changeFrequency: "weekly" as const,
            priority: path === "/" ? 1 : 0.5,
        })),
        ...(businesses ?? []).map((business) => ({
            url: absoluteUrl(`/businesses/${business.id}`),
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
