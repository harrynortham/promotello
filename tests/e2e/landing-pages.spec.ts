import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Pages built for search: one per neighbourhood and one per subcategory,
// with their own titles, canonical addresses and sitemap entries.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

// A Bristol area with at least one approved business.
async function busyArea() {
    const { data } = await admin()
        .from("business_locations")
        .select("areas!inner ( name, slug ), businesses!inner ( approval_status )")
        .eq("businesses.approval_status", "approved")
        .limit(1)
        .single();
    const area = Array.isArray(data!.areas) ? data!.areas[0] : data!.areas;
    return area as { name: string; slug: string };
}

test("each neighbourhood has its own page", async ({ page }) => {
    const area = await busyArea();

    await page.goto(`/explore/bristol/${area.slug}`);
    await expect(page.getByRole("heading", { name: `${area.name}, Bristol`, level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(`^${area.name}, Bristol: offers, loyalty cards`));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/explore/bristol/${area.slug}$`));
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: `Businesses in ${area.name}` })).toBeVisible();

    // Old filter links go to the page.
    await page.goto(`/explore/bristol?area=${encodeURIComponent(area.name)}`);
    await page.waitForURL(`**/explore/bristol/${area.slug}`);

    // The explore page links to it.
    await page.goto("/explore/bristol");
    await expect(page.locator(`a[href="/explore/bristol/${area.slug}"]`).first()).toBeVisible();
});

test("areas with no businesses yet aren't indexed, and unknown ones are not found", async ({ page }) => {
    const [{ data: areas }, { data: used }] = await Promise.all([
        admin().from("areas").select("id, slug, cities!inner ( slug )").eq("cities.slug", "bristol").eq("is_active", true),
        admin().from("business_locations").select("area_id"),
    ]);
    const taken = new Set((used ?? []).map((row) => row.area_id));
    const empty = (areas ?? []).find((area) => !taken.has(area.id));

    if (empty) {
        await page.goto(`/explore/bristol/${empty.slug}`);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }

    await page.goto("/explore/bristol/no-such-area");
    await expect(page.getByRole("heading", { name: /wasn.t the discovery you had in mind/ })).toBeVisible();
});

test("subcategories have their own pages", async ({ page }) => {
    await page.goto("/categories/food-drink?sub=bakeries");
    await page.waitForURL("**/categories/bakeries");
    await expect(page).toHaveTitle(/^Bakeries in .+: offers and loyalty cards/);

    await page.goto("/categories/bakeries/bristol");
    await expect(page.getByRole("heading", { name: "Bakeries in Bristol", level: 1 })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/categories\/bakeries\/bristol$/);

    // The parent category's chips link to them.
    await page.goto("/categories/food-drink/bristol");
    await expect(page.locator('a[href="/categories/bakeries/bristol"]')).toBeVisible();
});

test("the sitemap lists neighbourhood and subcategory pages with content", async ({ request }) => {
    const area = await busyArea();
    const sitemap = await (await request.get("/sitemap.xml")).text();

    expect(sitemap).toContain(`/explore/bristol/${area.slug}</loc>`);
    expect(sitemap).toMatch(/\/categories\/[a-z-]+\/bristol<\/loc>/);
});
