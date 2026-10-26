import { collection, config, fields } from "@keystatic/core";
import { block, wrapper } from "@keystatic/core/content-components";

// The blog's editor, at /keystatic. Posts are Markdoc files in content/blog
// and authors are in content/authors, so they're versioned with the code.
//
// Locally it saves straight to the files. On the live site it saves through
// GitHub (each save is a commit, which Vercel then deploys), once the
// GitHub app is set up: see docs/BLOG.md.

// GitHub mode: set NEXT_PUBLIC_KEYSTATIC_STORAGE=github (and, once the
// GitHub app exists, its four KEYSTATIC_ variables). See docs/BLOG.md.
export const useGitHub =
    process.env.NEXT_PUBLIC_KEYSTATIC_STORAGE === "github" || Boolean(process.env.NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG);

export const blogCategories = [
    { label: "Customer loyalty", value: "loyalty" },
    { label: "Marketing and offers", value: "marketing" },
    { label: "Running your business", value: "running-a-business" },
] as const;

export const ctaTargets = [
    { label: "Start free (sign up)", value: "signup" },
    { label: "See pricing", value: "pricing" },
    { label: "See features", value: "features" },
    { label: "Try the demo", value: "demo" },
] as const;

const images = { directory: "public/images/blog", publicPath: "/images/blog/" };

export default config({
    storage: useGitHub
        ? { kind: "github", repo: { owner: "harrynortham", name: "promotello" } }
        : { kind: "local" },
    ui: {
        brand: { name: "Promotello blog" },
    },
    collections: {
        posts: collection({
            label: "Blog posts",
            slugField: "title",
            path: "content/blog/*",
            format: { contentField: "content" },
            entryLayout: "content",
            columns: ["title", "publishedAt"],
            schema: {
                title: fields.slug({
                    name: {
                        label: "Title",
                        description: "Write it the way a business owner would search or ask: e.g. \"How to get more repeat customers\".",
                        validation: { length: { min: 10, max: 90 } },
                    },
                    slug: {
                        label: "Web address",
                        description: "The end of the post's address: promotello.com/blog/…",
                    },
                }),
                summary: fields.text({
                    label: "Summary",
                    description:
                        "One or two sentences that answer the question directly. Shown on the blog page, in search results and when shared (aim for 140 to 160 characters).",
                    multiline: true,
                    validation: { length: { min: 50, max: 220 } },
                }),
                draft: fields.checkbox({
                    label: "Draft",
                    description: "Drafts are hidden from the site. Untick to publish.",
                    defaultValue: true,
                }),
                publishedAt: fields.date({ label: "Published on", validation: { isRequired: true } }),
                updatedAt: fields.date({
                    label: "Last updated",
                    description: "Set this when you meaningfully update a post. Search engines and AI tools favour fresh content.",
                }),
                category: fields.select({ label: "Category", options: [...blogCategories], defaultValue: "loyalty" }),
                author: fields.relationship({
                    label: "Author",
                    collection: "authors",
                    validation: { isRequired: true },
                }),
                coverImage: fields.image({ label: "Cover image", description: "Optional. Wide, at least 1200 pixels across.", ...images }),
                coverAlt: fields.text({ label: "Cover image description", description: "What the image shows, for people who can't see it." }),
                keyTakeaways: fields.array(fields.text({ label: "Takeaway" }), {
                    label: "Key takeaways",
                    description: "Three to five one-line points, shown at the top. AI tools and skim-readers love these.",
                    itemLabel: (props) => props.value || "Takeaway",
                }),
                faqs: fields.array(
                    fields.object({
                        question: fields.text({ label: "Question" }),
                        answer: fields.text({ label: "Answer", multiline: true }),
                    }),
                    {
                        label: "Questions and answers",
                        description: "Questions business owners actually ask, answered in two to four sentences. Shown at the end and marked up for Google.",
                        itemLabel: (props) => props.fields.question.value || "Question",
                    },
                ),
                content: fields.markdoc({
                    label: "Content",
                    options: { image: images },
                    components: {
                        cta: block({
                            label: "Call to action",
                            schema: {
                                heading: fields.text({ label: "Heading" }),
                                text: fields.text({ label: "Text", multiline: true }),
                                target: fields.select({ label: "Button", options: [...ctaTargets], defaultValue: "signup" }),
                            },
                        }),
                        callout: wrapper({
                            label: "Callout",
                            schema: {
                                tone: fields.select({
                                    label: "Style",
                                    options: [
                                        { label: "Tip", value: "tip" },
                                        { label: "Example", value: "example" },
                                        { label: "Watch out", value: "warning" },
                                    ],
                                    defaultValue: "tip",
                                }),
                            },
                        }),
                    },
                }),
            },
        }),
        authors: collection({
            label: "Authors",
            slugField: "name",
            path: "content/authors/*",
            format: { data: "yaml" },
            schema: {
                name: fields.slug({ name: { label: "Name" } }),
                role: fields.text({ label: "Role", description: "e.g. Founder, Promotello" }),
                bio: fields.text({ label: "Short bio", multiline: true, description: "Two or three sentences on why they know this subject." }),
                avatar: fields.image({ label: "Photo", directory: "public/images/authors", publicPath: "/images/authors/" }),
                linkedin: fields.url({ label: "LinkedIn profile" }),
            },
        }),
    },
});
