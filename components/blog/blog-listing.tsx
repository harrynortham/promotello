import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { PostCard } from "@/components/blog/post-card";
import { Button } from "@/components/ui/button";
import { blogCategories } from "@/keystatic.config";
import type { PostSummary } from "@/lib/blog";

// The blog home and category pages.
export function BlogListing({
    posts,
    category,
    title,
    intro,
}: {
    posts: PostSummary[];
    category: string | null;
    title: string;
    intro: string;
}) {
    return (
        <main className="flex-1 pb-24">
            <section className="mx-auto max-w-7xl px-6 pb-10 pt-14 sm:px-10 sm:pt-20">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">The Promotello blog</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#17233B]/70">{intro}</p>

                <nav aria-label="Blog categories" className="mt-8 flex flex-wrap gap-2">
                    {[{ label: "All posts", value: null }, ...blogCategories].map((item) => {
                        const active = item.value === category;
                        return (
                            <Link
                                key={item.label}
                                href={item.value ? `/blog/category/${item.value}` : "/blog"}
                                aria-current={active ? "page" : undefined}
                                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${active
                                    ? "border-[#17233B] bg-[#17233B] text-white"
                                    : "border-[#17233B]/15 bg-white text-[#17233B]/75 hover:border-[#17233B]/40 hover:text-[#17233B]"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </section>

            <section className="mx-auto max-w-7xl px-6 sm:px-10">
                {posts.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-[#17233B]/20 p-10 text-center text-[#17233B]/70">
                        No posts here yet. New guides are on their way.
                    </p>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.map((post) => (
                            <PostCard key={post.slug} post={post} />
                        ))}
                    </div>
                )}
            </section>

            <section className="mx-auto mt-20 max-w-7xl px-6 sm:px-10">
                <div className="flex flex-col items-start gap-6 rounded-3xl bg-[#17233B] px-8 py-12 text-white sm:flex-row sm:items-center sm:justify-between sm:px-12">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn first-time visitors into regulars</h2>
                        <p className="mt-2 max-w-xl text-white/80">
                            Digital loyalty cards, offers and QR posters for independent businesses. Free to start.
                        </p>
                    </div>
                    <Button render={<Link href="/business/register" />} nativeButton={false} size="lg" className="shrink-0">
                        Start free
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>
            </section>
        </main>
    );
}
