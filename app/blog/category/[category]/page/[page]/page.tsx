import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogListing } from "@/components/blog/blog-listing";
import { blogCategories } from "@/keystatic.config";
import { getPosts, paginatePosts, POSTS_PER_PAGE } from "@/lib/blog";

type PageProps = { params: Promise<{ category: string; page: string }> };

// Page one lives at /blog/category/<category>, so this covers 2 and up. Cache
// Components requires at least one param, so when no category has a second
// page yet we still name one: that page 404s, which is correct.
export async function generateStaticParams() {
    const posts = await getPosts();

    const pages = blogCategories.flatMap((category) => {
        const count = posts.filter((post) => post.category === category.value).length;
        const total = Math.ceil(count / POSTS_PER_PAGE);

        return Array.from({ length: Math.max(0, total - 1) }, (_, index) => ({
            category: category.value,
            page: String(index + 2),
        }));
    });

    return pages.length > 0 ? pages : [{ category: blogCategories[0].value, page: "2" }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { category: slug, page } = await params;
    const category = blogCategories.find((item) => item.value === slug);
    if (!category) return { title: "Not found", robots: { index: false } };

    return {
        title: `${category.label}: guides for small businesses (page ${page})`,
        description: `Practical guides on ${category.label.toLowerCase()} for independent cafés, salons and shops.`,
        alternates: { canonical: `/blog/category/${category.value}/page/${page}` },
    };
}

export default async function BlogCategoryPaginatedPage({ params }: PageProps) {
    const { category: slug, page: requestedParam } = await params;
    const category = blogCategories.find((item) => item.value === slug);

    if (!category) {
        notFound();
    }

    const requested = Number(requestedParam);
    const posts = (await getPosts()).filter((post) => post.category === category.value);
    const { pagePosts, page, totalPages } = paginatePosts(posts, requested);

    if (!Number.isInteger(requested) || requested !== page || page === 1) {
        notFound();
    }

    return (
        <BlogListing
            posts={pagePosts}
            category={category.value}
            title={category.label}
            intro={`Practical guides on ${category.label.toLowerCase()} for independent cafés, salons, barbers and shops.`}
            basePath={`/blog/category/${category.value}`}
            page={page}
            totalPages={totalPages}
        />
    );
}
