import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    agentUpgrade: "security",
  },
  cacheComponents: true,
  // Keystatic in GitHub mode moves the dev site to 127.0.0.1 (for GitHub's
  // sign-in callback); the dev server blocks unknown origins otherwise.
  allowedDevOrigins: ["127.0.0.1"],
  // Blog posts are files read at build time; ship them with the server too
  // in case a page is regenerated.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
  // Page titles and descriptions are streamed to browsers, but these
  // crawlers and link-preview bots get them in the <head> up front.
  htmlLimitedBots:
    /Googlebot|Google-InspectionTool|Storebot-Google|bingbot|DuckDuckBot|Applebot|YandexBot|Baiduspider|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Pinterest|redditbot|SkypeUriPreview|iMessage/i,
  // Passwords are gone: signing in is a code we email. Anyone with one of
  // these bookmarked, or following an old email, lands where they can ask
  // for a code instead of on a 404.
  async redirects() {
    return [
      { source: "/forgot-password", destination: "/login", permanent: true },
      { source: "/reset-password", destination: "/login", permanent: true },
    ];
  },
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
          // The camera is how staff stamp a loyalty card and redeem a
          // voucher (components/scan-qr-button), and location is behind
          // "Use my location". Nothing needs the microphone. A policy
          // denying the camera doesn't just hide a button: getUserMedia
          // rejects, so the scanners fall back to typing the code.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
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
