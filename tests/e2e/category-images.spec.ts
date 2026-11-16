import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import zlib from "zlib";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// The picture on a category is uploaded here rather than named as a URL
// hosted somewhere else
// (20270122090000_a_category_picture_is_uploaded.sql).

const needsMigration =
    "apply supabase/migrations/20270122090000_a_category_picture_is_uploaded.sql first";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

// A real PNG, built here so the suite carries no binary fixture. The
// cropper has to decode it, so it cannot be a stub.
function png(width = 240, height = 240) {
    const chunk = (type: string, data: Buffer) => {
        const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(zlib.crc32(body) >>> 0);
        return Buffer.concat([length, body, crc]);
    };

    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 2;

    const rows: number[] = [];
    for (let y = 0; y < height; y++) {
        rows.push(0);
        for (let x = 0; x < width; x++) {
            const on = (Math.floor(x / 30) + Math.floor(y / 30)) % 2 === 0;
            rows.push(on ? 255 : 23, on ? 89 : 35, on ? 63 : 59);
        }
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", header),
        chunk("IDAT", zlib.deflateSync(Buffer.from(rows))),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

test("an admin uploads a category picture, and it is saved and public", async ({ browser }) => {
    // The admin page is big, and a dev server compiling it cold is slow.
    test.setTimeout(300_000);

    const client = admin();
    const { businessUserId } = state();

    // The same person wears both hats, which is how the other admin
    // tests do it.
    await client.from("platform_admins").insert({ user_id: businessUserId });

    // A category of our own, so a real one is never left changed.
    const slug = `e2e-picture-${Date.now()}`;
    const { data: category } = await client
        .from("categories")
        .insert({ name: `E2E Picture ${Date.now()}`, slug, sort_order: 999 })
        .select("id")
        .single();

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        await page.goto("/admin/categories", { timeout: 120_000 });

        // Everything is scoped to this category's edit form. Three
        // forms carry its id — edit, delete, and the one that adds a
        // subcategory under it — so the image field is what tells them
        // apart.
        const form = page.locator(
            `form:has(input[name="id"][value="${category!.id}"]):has(input[name="imageUrl"])`,
        );
        await expect(form, needsMigration).toHaveCount(1, { timeout: 90_000 });

        // Each category sits in a <details> inside its group's, and a
        // closed one keeps the save button out of reach.
        await form.evaluate((node) => {
            for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                if (parent instanceof HTMLDetailsElement) parent.open = true;
            }
        });

        await form.scrollIntoViewIfNeeded();

        // The field is an uploader, not a URL box. A URL box is the
        // thing this replaced, so its absence is the point.
        await expect(form.locator('input[name="imageUrl"][type="url"]')).toHaveCount(0);
        await expect(form.locator('input[name="imageUrl"][type="hidden"]')).toHaveCount(1);

        await form.locator('input[type="file"]').setInputFiles({
            name: "category.png",
            mimeType: "image/png",
            buffer: png(),
        });

        // Cropped in a dialog, then uploaded as soon as it is confirmed.
        await page.getByRole("button", { name: "Use this image" }).click({ timeout: 60_000 });

        const hidden = form.locator('input[name="imageUrl"]');
        await expect
            .poll(async () => (await hidden.inputValue()).includes("category-images"), {
                timeout: 60_000,
                message: "the upload never filled the field the form submits",
            })
            .toBe(true);

        await form.getByRole("button", { name: "Save changes" }).click();
        await page.waitForURL(/saved=1/, { timeout: 60_000 });

        const { data: saved } = await client
            .from("categories")
            .select("image_url")
            .eq("id", category!.id)
            .single();

        expect(saved?.image_url, "the uploaded picture is on the category").toContain(
            "category-images",
        );

        // Categories are public, so their pictures have to be readable
        // without signing in.
        const response = await fetch(saved!.image_url as string);
        expect(response.status, "the picture is publicly readable").toBe(200);
        expect(response.headers.get("content-type")).toContain("image");
    } finally {
        await client.from("categories").delete().eq("id", category!.id);
        await client.from("platform_admins").delete().eq("user_id", businessUserId);
    }
});

test("only a platform admin can put a picture in the bucket", async () => {
    const { businessEmail, testPassword } = state();

    const asUser = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const file = new Blob([png(8, 8)], { type: "image/png" });

    // Signed in, but not a platform admin: a business owner.
    await asUser.auth.signInWithPassword({ email: businessEmail, password: testPassword });
    const asOwner = await asUser.storage
        .from("category-images")
        .upload(`not-mine/${Date.now()}.png`, file, { contentType: "image/png" });

    expect(asOwner.error, needsMigration).not.toBeNull();

    // And nobody at all.
    const anonymous = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const asNobody = await anonymous.storage
        .from("category-images")
        .upload(`nobody/${Date.now()}.png`, file, { contentType: "image/png" });

    expect(asNobody.error, "an anonymous visitor cannot write to the bucket").not.toBeNull();
});
