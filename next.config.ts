import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    agentUpgrade: "security",
  },
  cacheComponents: true,
  // Page titles and descriptions are streamed to browsers, but these
  // crawlers and link-preview bots get them in the <head> up front.
  htmlLimitedBots:
    /Googlebot|Google-InspectionTool|Storebot-Google|bingbot|DuckDuckBot|Applebot|YandexBot|Baiduspider|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Pinterest|redditbot|SkypeUriPreview|iMessage/i,
  // Security headers on every page. Vercel already adds HSTS.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nobody may show Promotello inside a frame (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Location is used by "Use my location"; nothing needs the
          // camera or microphone.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "owdxoarqivpoplpqiylt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
