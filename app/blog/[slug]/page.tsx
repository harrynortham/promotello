import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";

import { PostBody } from "@/components/blog/post-body";
import { PostCard } from "@/components/blog/post-card";
import { formatPostDate, getPost, getPosts, type Post } from "@/lib/blog";
import { absoluteUrl, jsonLd, siteName } from "@/lib/site";
import { company } from "@/lib/legal";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
    return (await getPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const post = await getPost((await params).slug);
    if (!post) return { title: "Not found", robots: { index: false } };

    const path = `/blog/${post.slug}`;

    return {
        title: post.title,
        description: post.summary,
        alternates: {
            canonical: path,
            types: { "text/markdown": `/blog/md/${post.slug}` },
        },
        authors: post.author ? [{ name: post.author.name }] : undefined,
        openGraph: {
            type: "article",
            url: path,
            title: post.title,
            description: post.summary,
            publishedTime: post.publishedAt,
            modifiedTime: post.updatedAt ?? post.publishedAt,
            authors: post.author ? [post.author.name] : undefined,
            section: post.categoryLabel,
        },
    };
}

// Structured data for search engines and AI tools: the article, its
// questions and answers, and the breadcrumb.
function structuredData(post: Post) {
    const url = absoluteUrl(`/blog/${post.slug}`);

    const article = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.summary,
        url,
        mainEntityOfPage: url,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        articleSection: post.categoryLabel,
        inLanguage: "en-GB",
        image: post.coverImage ? absoluteUrl(post.coverImage) : absoluteUrl(`/blog/${post.slug}/opengraph-image`),
        author: post.author
            ? {
                "@type": "Person",
                name: post.author.name,
                jobTitle: post.author.role || undefined,
                sameAs: post.author.linkedin ? [post.author.linkedin] : undefined,
            }
            : { "@type": "Organization", name: siteName },
        publisher: {
            "@type": "Organization",
            name: siteName,
            legalName: company.name,
            url: absoluteUrl("/"),
            logo: { "@type": "ImageObject", url: absoluteUrl("/brand/promotello-horizontal-primary.svg") },
        },
    };

    const faq = post.faqs.length
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faqs.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
        }
        : null;

    const breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { name: "Blog", item: absoluteUrl("/blog") },
            { name: post.categoryLabel, item: absoluteUrl(`/blog/category/${post.category}`) },
            { name: post.title, item: url },
        ].map((crumb, index) => ({ "@type": "ListItem", position: index + 1, ...crumb })),
    };

    return [article, faq, breadcrumbs].filter(Boolean);
}

export default async function BlogPostPage({ params }: PageProps) {
    const post = await getPost((await params).slug);

    if (!post) {
        notFound();
    }

    const others = (await getPosts()).filter((item) => item.slug !== post.slug);
    const related = [
        ...others.filter((item) => item.category === post.category),
        ...others.filter((item) => item.category !== post.category),
    ].slice(0, 3);

    return (
        <main className="flex-1 pb-24">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(post)) }} />

            <article>
                <header className="mx-auto max-w-3xl px-6 pt-10 sm:px-10 sm:pt-16">
                    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-[#17233B]/70">
                        <Link href="/blog" className="inline-flex items-center gap-1.5 hover:text-[#17233B]">
                            <FiArrowLeft aria-hidden="true" />
                            Blog
                        </Link>
                        <span aria-hidden="true">/</span>
                        <Link href={`/blog/category/${post.category}`} className="hover:text-[#17233B]">
                            {post.categoryLabel}
                        </Link>
                    </nav>

                    <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
                    <p className="mt-5 text-xl leading-8 text-[#17233B]/75">{post.summary}</p>

                    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#17233B]/70">
                        {post.author && <span className="font-medium text-[#17233B]">{post.author.name}</span>}
                        <span aria-hidden="true">·</span>
                        <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
                        {post.updatedAt && post.updatedAt !== post.publishedAt && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>
                                    Updated <time dateTime={post.updatedAt}>{formatPostDate(post.updatedAt)}</time>
                                </span>
                            </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{post.readingMinutes} min read</span>
                    </div>
                </header>

                {post.coverImage && (
                    <div className="mx-auto mt-10 max-w-5xl px-6 sm:px-10">
                        <div className="relative aspect-[16/9] overflow-hidden rounded-3xl">
                            <Image src={post.coverImage} alt={post.coverAlt} fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
                        </div>
                    </div>
                )}

                <div className="mx-auto max-w-3xl px-6 sm:px-10">
                    {post.keyTakeaways.length > 0 && (
                        <section aria-labelledby="takeaways" className="mt-10 rounded-3xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
                            <h2 id="takeaways" className="text-lg font-semibold">
                                Key takeaways
                            </h2>
                            <ul className="mt-4 space-y-3">
                                {post.keyTakeaways.map((takeaway) => (
                                    <li key={takeaway} className="flex gap-3 leading-7 text-[#17233B]/85">
                                        <FiCheckCircle aria-hidden="true" className="mt-1.5 shrink-0 text-[#FF593F]" />
                                        {takeaway}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {post.headings.length >= 3 && (
                        <nav aria-labelledby="contents" className="mt-8 border-l-2 border-[#FF593F] pl-5">
                            <h2 id="contents" className="text-sm font-semibold uppercase tracking-[0.14em] text-[#17233B]/70">
                                In this guide
                            </h2>
                            <ol className="mt-3 space-y-2 text-[#17233B]/85">
                                {post.headings.map((heading) => (
                                    <li key={heading.id}>
                                        <a href={`#${heading.id}`} className="hover:text-[#17233B] hover:underline">
                                            {heading.text}
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    )}

                    <div className="mt-10">
                        <PostBody body={post.body} />
                    </div>

                    {post.faqs.length > 0 && (
                        <section aria-labelledby="faqs" className="mt-14">
                            <h2 id="faqs" className="text-2xl font-semibold tracking-tight">
                                Questions and answers
                            </h2>
                            <div className="mt-6 divide-y divide-[#17233B]/10 rounded-3xl border border-[#17233B]/10 bg-white">
                                {post.faqs.map((faq) => (
                                    <div key={faq.question} className="p-6">
                                        <h3 className="font-semibold">{faq.question}</h3>
                                        <p className="mt-2 leading-7 text-[#17233B]/80">{faq.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {post.author && (
                        <aside aria-label="About the author" className="mt-14 flex gap-5 rounded-3xl bg-white p-6 sm:p-8">
                            {post.author.avatar ? (
                                <Image src={post.author.avatar} alt="" width={64} height={64} className="size-16 shrink-0 rounded-full object-cover" />
                            ) : (
                                <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#17233B] text-xl font-semibold text-white">
                                    {post.author.name.charAt(0)}
                                </span>
                            )}
                            <div>
                                <p className="font-semibold">{post.author.name}</p>
                                {post.author.role && <p className="text-sm text-[#17233B]/70">{post.author.role}</p>}
                                {post.author.bio && <p className="mt-2 leading-7 text-[#17233B]/80">{post.author.bio}</p>}
                                {post.author.linkedin && (
                                    <a href={post.author.linkedin} rel="noopener noreferrer" target="_blank" className="mt-2 inline-block text-sm font-medium underline">
                                        LinkedIn
                                    </a>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </article>

            {related.length > 0 && (
                <section aria-labelledby="related" className="mx-auto mt-20 max-w-7xl px-6 sm:px-10">
                    <h2 id="related" className="text-2xl font-semibold tracking-tight">
                        Keep reading
                    </h2>
                    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((item) => (
                            <PostCard key={item.slug} post={item} />
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
