import Image from "next/image";
import Link from "next/link";

import { formatPostDate, type PostSummary } from "@/lib/blog";

export function PostCard({ post }: { post: PostSummary }) {
    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative aspect-[16/9] overflow-hidden bg-[#17233B]">
                {post.coverImage ? (
                    <Image
                        src={post.coverImage}
                        alt={post.coverAlt}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-end bg-gradient-to-br from-[#17233B] to-[#2a3a5c] p-5">
                        <span className="rounded-full bg-[#FF593F] px-3 py-1 text-xs font-semibold text-white">
                            {post.categoryLabel}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FF593F]">{post.categoryLabel}</p>
                <h3 className="mt-2 text-xl font-semibold leading-snug">
                    <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                        {post.title}
                    </Link>
                </h3>
                <p className="mt-3 flex-1 leading-7 text-[#17233B]/70">{post.summary}</p>
                <p className="mt-5 text-sm text-[#17233B]/70">
                    {formatPostDate(post.publishedAt)} · {post.readingMinutes} min read
                </p>
            </div>
        </article>
    );
}
