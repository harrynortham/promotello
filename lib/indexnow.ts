import { getPosts } from "@/lib/blog";
import { absoluteUrl, siteUrl } from "@/lib/site";

// IndexNow tells Bing (and through it ChatGPT search and Copilot), Yandex
// and others about new or updated pages straight away, instead of waiting
// for a crawl. The key isn't secret: it's published at /indexnow.txt to
// prove the site owns the submissions.
export const INDEXNOW_KEY = "cefa3cfd7ad148266de3ccf7861d2e4e";

// Daily: blog posts published or updated in the last two days. Only on the
// production site.
export async function submitRecentPosts(today = new Date()) {
    if (process.env.NEXT_PUBLIC_VERCEL_ENV !== "production") {
        return { submitted: 0 };
    }

    const since = new Date(today.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
    const urls = (await getPosts())
        .filter((post) => (post.updatedAt ?? post.publishedAt) >= since)
        .map((post) => absoluteUrl(`/blog/${post.slug}`));

    if (urls.length === 0) {
        return { submitted: 0 };
    }

    const response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
            host: new URL(siteUrl).host,
            key: INDEXNOW_KEY,
            keyLocation: absoluteUrl("/indexnow.txt"),
            urlList: [...urls, absoluteUrl("/blog")],
        }),
    });

    if (!response.ok) {
        console.error("IndexNow: submission failed", response.status, await response.text());
        return { submitted: 0 };
    }

    return { submitted: urls.length };
}
