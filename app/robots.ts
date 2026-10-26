import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

// Signed-in areas and pages crawlers shouldn't visit. The per-business
// dashboard (/business/<id>/…) can't be told apart from /business marketing
// pages here, so it is excluded with a noindex tag in its layout instead.
const privatePaths = [
    "/dashboard",
    "/account",
    "/admin",
    "/business/dashboard",
    "/business/register",
    "/business/preview/",
    "/invite/",
    "/auth/",
    "/api/",
    "/keystatic",
    // QR scan links: crawlers would count as scans.
    "/q/",
    // Staff pages opened by scanning a customer's card or voucher.
    "/stamp/",
    "/redeem/",
    "/unsubscribe/",
];

// AI assistants and AI search, named so it's clear they're welcome (they
// help people find and cite Promotello). Training and search crawlers both.
const aiCrawlers = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "Bingbot",
    "CCBot",
    "meta-externalagent",
    "MistralAI-User",
    "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            { userAgent: "*", allow: "/", disallow: privatePaths },
            { userAgent: aiCrawlers, allow: "/", disallow: privatePaths },
        ],
        sitemap: absoluteUrl("/sitemap.xml"),
    };
}
