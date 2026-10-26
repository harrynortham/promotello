import { formatPostDate, getPost, getPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

// Each post as plain Markdown, for AI tools and anyone who wants the text
// without the page around it. Listed in /llms.txt.

export async function generateStaticParams() {
    return (await getPosts()).map((post) => ({ slug: post.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const post = await getPost((await params).slug);

    if (!post) {
        return new Response("Not found", { status: 404 });
    }

    const lines = [
        `# ${post.title}`,
        "",
        `> ${post.summary}`,
        "",
        `Published ${formatPostDate(post.publishedAt)}${post.updatedAt ? `, updated ${formatPostDate(post.updatedAt)}` : ""}${post.author ? ` by ${post.author.name}${post.author.role ? `, ${post.author.role}` : ""}` : ""}.`,
        `Source: ${absoluteUrl(`/blog/${post.slug}`)}`,
        "",
        ...(post.keyTakeaways.length ? ["## Key takeaways", "", ...post.keyTakeaways.map((item) => `- ${item}`), ""] : []),
        post.markdown,
        "",
        ...(post.faqs.length
            ? ["## Questions and answers", "", ...post.faqs.flatMap((faq) => [`### ${faq.question}`, "", faq.answer, ""])]
            : []),
    ];

    return new Response(lines.join("\n"), {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
}
