import { test, expect } from "@playwright/test";

// The blog: listing, posts with their structured data, and the extras for
// search engines and AI tools.

test("the blog lists published posts and links to them", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Guides for independent business owners", level: 1 })).toBeVisible();

    await page.getByRole("link", { name: /How to fill quiet hours/ }).click();
    await page.waitForURL("**/blog/how-to-fill-quiet-hours");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("How to fill quiet hours");
});

test("a post has its takeaways, contents, answers and structured data", async ({ page }) => {
    await page.goto("/blog/digital-vs-paper-loyalty-cards");

    await expect(page.getByRole("heading", { name: "Key takeaways" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "In this guide" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Questions and answers" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/blog\/digital-vs-paper-loyalty-cards$/);

    const types = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((scripts) => scripts.flatMap((script) => [JSON.parse(script.textContent ?? "null")].flat().map((item) => item?.["@type"])));
    expect(types).toEqual(expect.arrayContaining(["BlogPosting", "FAQPage", "BreadcrumbList"]));
});

test("category pages show only their posts", async ({ page }) => {
    await page.goto("/blog/category/marketing");
    await expect(page.getByRole("link", { name: /How to fill quiet hours/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Digital loyalty cards vs paper/ })).toHaveCount(0);
});

test("AI tools get llms.txt, Markdown posts and an open robots.txt", async ({ request }) => {
    const llms = await (await request.get("/llms.txt")).text();
    expect(llms).toMatch(/^# Promotello/);
    expect(llms).toContain("/blog/md/how-to-get-more-repeat-customers");

    const markdown = await request.get("/blog/md/how-to-get-more-repeat-customers");
    expect(markdown.headers()["content-type"]).toContain("text/markdown");
    const body = await markdown.text();
    expect(body).toMatch(/^# How to get more repeat customers/);
    expect(body).not.toContain("{%");

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("User-Agent: GPTBot");
    expect(robots).toContain("Disallow: /keystatic");

    const rss = await (await request.get("/blog/rss.xml")).text();
    expect(rss).toContain("<rss");
    expect(rss).toContain("/blog/how-to-fill-quiet-hours");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/blog/digital-vs-paper-loyalty-cards</loc>");
});
