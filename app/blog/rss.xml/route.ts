import { getPosts } from "@/lib/blog";
import { absoluteUrl, siteName } from "@/lib/site";

// RSS feed of published posts.

function escape(value: string) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
    const posts = await getPosts();

    const items = posts
        .map(
            (post) => `    <item>
      <title>${escape(post.title)}</title>
      <link>${absoluteUrl(`/blog/${post.slug}`)}</link>
      <guid>${absoluteUrl(`/blog/${post.slug}`)}</guid>
      <pubDate>${new Date(`${post.publishedAt}T09:00:00Z`).toUTCString()}</pubDate>
      <category>${escape(post.categoryLabel)}</category>
      <description>${escape(post.summary)}</description>
    </item>`,
        )
        .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName} blog</title>
    <link>${absoluteUrl("/blog")}</link>
    <atom:link href="${absoluteUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml" />
    <description>Guides for independent business owners: loyalty, offers and repeat customers.</description>
    <language>en-GB</language>
${items}
  </channel>
</rss>`;

    return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
