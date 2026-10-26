import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogListing } from "@/components/blog/blog-listing";
import { blogCategories } from "@/keystatic.config";
import { getPosts } from "@/lib/blog";

type PageProps = { params: Promise<{ category: string }> };

export function generateStaticParams() {
    return blogCategories.map((category) => ({ category: category.value }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const slug = (await params).category;
    const category = blogCategories.find((item) => item.value === slug);
    if (!category) return { title: "Not found", robots: { index: false } };

    return {
        title: `${category.label}: guides for small businesses`,
        description: `Practical guides on ${category.label.toLowerCase()} for independent cafés, salons and shops.`,
        alternates: { canonical: `/blog/category/${category.value}` },
    };
}

export default async function BlogCategoryPage({ params }: PageProps) {
    const slug = (await params).category;
    const category = blogCategories.find((item) => item.value === slug);

    if (!category) {
        notFound();
    }

    const posts = (await getPosts()).filter((post) => post.category === category.value);

    return (
        <BlogListing
            posts={posts}
            category={category.value}
            title={category.label}
            intro={`Practical guides on ${category.label.toLowerCase()} for independent cafés, salons, barbers and shops.`}
        />
    );
}
