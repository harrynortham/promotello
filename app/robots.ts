import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Signed-in areas. The per-business dashboard (/business/<id>/…)
            // can't be told apart from /business marketing pages here, so it
            // is excluded with a noindex tag in its layout instead.
            disallow: [
                "/dashboard",
                "/account",
                "/admin",
                "/business/dashboard",
                "/business/register",
                "/invite/",
                "/auth/",
                "/api/",
                // QR scan links: crawlers would count as scans.
                "/q/",
            ],
        },
        sitemap: absoluteUrl("/sitemap.xml"),
    };
}
