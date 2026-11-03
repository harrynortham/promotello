import type { Metadata } from "next";

import { BLOG_INTRO, BLOG_TITLE, BlogListing } from "@/components/blog/blog-listing";
import { getPosts, paginatePosts } from "@/lib/blog";

export const metadata: Metadata = {
    title: "Blog: guides for independent business owners",
    description:
        "Practical guides on loyalty cards, offers and getting more repeat customers, for independent cafés, salons and shops.",
    alternates: {
        canonical: "/blog",
        types: { "application/rss+xml": "/blog/rss.xml" },
    },
};

export default async function BlogPage() {
    const { pagePosts, page, totalPages } = paginatePosts(await getPosts(), 1);

    return (
        <BlogListing
            posts={pagePosts}
            category={null}
            title={BLOG_TITLE}
            intro={BLOG_INTRO}
            basePath="/blog"
            page={page}
            totalPages={totalPages}
        />
    );
}
