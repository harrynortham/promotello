import Markdoc, { Tag, type Config, type Node, type RenderableTreeNode } from "@markdoc/markdoc";
import { createReader } from "@keystatic/core/reader";
import { cacheLife } from "next/cache";

import keystaticConfig, { blogCategories, ctaTargets } from "@/keystatic.config";

// Reads blog posts written in Keystatic (content/blog/*.mdoc). Posts only
// change with a deploy, so everything here is cached for the build.

export type BlogCategory = (typeof blogCategories)[number]["value"];

export type Author = {
    slug: string;
    name: string;
    role: string;
    bio: string;
    avatar: string | null;
    linkedin: string | null;
};

export type PostSummary = {
    slug: string;
    title: string;
    summary: string;
    publishedAt: string;
    updatedAt: string | null;
    category: BlogCategory;
    categoryLabel: string;
    coverImage: string | null;
    coverAlt: string;
    author: Author | null;
    readingMinutes: number;
};

export type Post = PostSummary & {
    keyTakeaways: string[];
    faqs: { question: string; answer: string }[];
    // Markdoc's render tree, for <PostBody>.
    body: RenderableTreeNode;
    // The post's h2 headings, for the table of contents.
    headings: { id: string; text: string }[];
    // The post as plain Markdown, for /blog/md/<slug> and AI tools.
    markdown: string;
};

const reader = () => createReader(process.cwd(), keystaticConfig);

export function headingId(text: string) {
    return text
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function textOf(node: Node): string {
    if (node.type === "text") return String(node.attributes.content ?? "");
    return node.children.map(textOf).join("");
}

function walk(node: Node, visit: (node: Node) => void) {
    visit(node);
    node.children.forEach((child) => walk(child, visit));
}

// Headings get ids so the table of contents (and anyone sharing a link to
// a section) can jump to them.
export const markdocConfig: Config = {
    nodes: {
        // No <article> wrapper: the page provides it, and the post styles
        // apply to the body's direct children.
        document: {
            transform(node, config) {
                return node.transformChildren(config);
            },
        },
        heading: {
            children: ["inline"],
            attributes: { level: { type: Number, required: true } },
            transform(node, config) {
                const children = node.transformChildren(config);
                const level = node.attributes.level as number;
                return new Tag(`h${level}`, { id: headingId(textOf(node)) }, children);
            },
        },
    },
    tags: {
        cta: {
            render: "CallToAction",
            selfClosing: true,
            attributes: {
                heading: { type: String },
                text: { type: String },
                target: { type: String, matches: ctaTargets.map((target) => target.value) },
            },
        },
        callout: {
            render: "Callout",
            attributes: { tone: { type: String } },
        },
    },
};

async function readAuthor(slug: string | null): Promise<Author | null> {
    if (!slug) return null;
    const author = await reader().collections.authors.read(slug);
    if (!author) return null;

    return {
        slug,
        name: author.name,
        role: author.role,
        bio: author.bio,
        avatar: author.avatar ?? null,
        linkedin: author.linkedin ?? null,
    };
}

function categoryLabel(category: string) {
    return blogCategories.find((item) => item.value === category)?.label ?? "Blog";
}

// Markdoc source to Markdown: drop the call-to-action blocks and callout
// tags (keeping the callout text).
function toMarkdown(source: string) {
    return source
        .replace(/\{%\s*cta[\s\S]*?\/%\}\n?/g, "")
        .replace(/\{%\s*\/?callout[^%]*%\}\n?/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

async function readPost(slug: string): Promise<Post | null> {
    const entry = await reader().collections.posts.read(slug);
    if (!entry || entry.draft) return null;

    const { node } = await entry.content();
    const words = textOf(node).split(/\s+/).filter(Boolean).length;
    const headings: Post["headings"] = [];
    walk(node, (child) => {
        if (child.type === "heading" && child.attributes.level === 2) {
            const text = textOf(child);
            headings.push({ id: headingId(text), text });
        }
    });

    return {
        slug,
        title: entry.title,
        summary: entry.summary,
        publishedAt: entry.publishedAt ?? "",
        updatedAt: entry.updatedAt ?? null,
        category: entry.category as BlogCategory,
        categoryLabel: categoryLabel(entry.category),
        coverImage: entry.coverImage ?? null,
        coverAlt: entry.coverAlt,
        author: await readAuthor(entry.author),
        readingMinutes: Math.max(1, Math.round(words / 220)),
        keyTakeaways: [...entry.keyTakeaways],
        faqs: entry.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
        // Plain objects, so the post can be cached (Markdoc's renderer
        // accepts them as well as its Tag class).
        body: JSON.parse(JSON.stringify(Markdoc.transform(node, markdocConfig))) as RenderableTreeNode,
        headings,
        markdown: toMarkdown(Markdoc.format(node)),
    };
}

export async function getPost(slug: string): Promise<Post | null> {
    "use cache";
    cacheLife("max");

    return readPost(slug);
}

// Published posts, newest first.
export async function getPosts(): Promise<PostSummary[]> {
    "use cache";
    cacheLife("max");

    const slugs = await reader().collections.posts.list();
    const posts = (await Promise.all(slugs.map(readPost))).filter((post): post is Post => post !== null);

    return posts
        .map((post) => ({
            slug: post.slug,
            title: post.title,
            summary: post.summary,
            publishedAt: post.publishedAt,
            updatedAt: post.updatedAt,
            category: post.category,
            categoryLabel: post.categoryLabel,
            coverImage: post.coverImage,
            coverAlt: post.coverAlt,
            author: post.author,
            readingMinutes: post.readingMinutes,
        }))
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function formatPostDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${value}T00:00:00Z`),
    );
}
