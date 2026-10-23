import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";

import { absoluteUrl } from "@/lib/site";
import { createPublicClient } from "@/utils/supabase/public";

const staticPaths = [
    "/",
    "/offers",
    "/businesses",
    "/explore",
    "/categories",
    "/about",
    "/help",
    "/contact",
    "/business",
    "/business/features",
    "/business/pricing",
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    "use cache";
    cacheLife("hours");

    const supabase = createPublicClient();

    // RLS limits both queries to what an anonymous visitor can see:
    // approved businesses, and approved, unexpired, unpaused offers.
    const [{ data: businesses }, { data: offers }] = await Promise.all([
        supabase.from("businesses").select("id, updated_at"),
        supabase.from("offers").select("slug, updated_at"),
    ]);

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
