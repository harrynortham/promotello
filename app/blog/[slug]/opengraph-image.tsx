import { notFound } from "next/navigation";

import { getPost, getPosts } from "@/lib/blog";
import { shareImage } from "@/lib/story-image";

// The link preview when a post is shared.
export const alt = "A guide from the Promotello blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
    return (await getPosts()).map((post) => ({ slug: post.slug }));
}

export default async function BlogOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
    const post = await getPost((await params).slug);
    if (!post) notFound();

    return shareImage(
        {
            eyebrow: "Promotello blog",
            business: post.categoryLabel,
            headline: post.title,
            detail: `${post.readingMinutes} min read`,
            url: `promotello.com/blog/${post.slug}`,
        },
        "og",
    );
}
