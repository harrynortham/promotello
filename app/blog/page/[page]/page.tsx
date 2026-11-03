import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BLOG_INTRO, BLOG_TITLE, BlogListing } from "@/components/blog/blog-listing";
import { getPosts, paginatePosts, POSTS_PER_PAGE } from "@/lib/blog";

type PageProps = { params: Promise<{ page: string }> };

// Page one lives at /blog, so this route only covers 2 and up. Cache
// Components requires at least one param, so when there is no page two yet we
// still name it: the page itself returns a 404, which is the right answer.
export async function generateStaticParams() {
    const total = Math.ceil((await getPosts()).length / POSTS_PER_PAGE);
    const pages = Array.from({ length: Math.max(0, total - 1) }, (_, index) => ({ page: String(index + 2) }));

    return pages.length > 0 ? pages : [{ page: "2" }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const page = Number((await params).page);

    return {
        title: `Blog: guides for independent business owners (page ${page})`,
        description:
            "Practical guides on loyalty cards, offers and getting more repeat customers, for independent cafés, salons and shops.",
        alternates: { canonical: `/blog/page/${page}` },
    };
}

export default async function BlogPaginatedPage({ params }: PageProps) {
    const requested = Number((await params).page);
    const posts = await getPosts();
    const { pagePosts, page, totalPages } = paginatePosts(posts, requested);

    // A page number that is not a real page, so it should not resolve.
    if (!Number.isInteger(requested) || requested !== page || page === 1) {
        notFound();
    }

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
