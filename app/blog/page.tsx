import type { Metadata } from "next";

import { BlogListing } from "@/components/blog/blog-listing";
import { getPosts } from "@/lib/blog";

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
    const posts = await getPosts();

    return (
        <BlogListing
            posts={posts}
            category={null}
            title="Guides for independent business owners"
            intro="Practical ideas for getting more repeat customers, filling quiet hours and making loyalty work, written for cafés, salons, barbers and shops."
        />
    );
}
