// Sample businesses and offers for demos before launch.
//
//   node --env-file=.env.local scripts/sample-data.mjs seed      # add them
//   node --env-file=.env.local scripts/sample-data.mjs seed --reset   # replace them
//   node --env-file=.env.local scripts/sample-data.mjs remove    # delete them
//
// Every sample business has is_sample = true: it's left out of the sitemap,
// marked noindex, and removed by `remove`. Needs SUPABASE_SERVICE_ROLE_KEY.

import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { sampleBusinesses } from "./sample-data/businesses.mjs";
import { downloadUnsplashPhoto } from "./sample-data/unsplash.mjs";

const SAMPLE_OWNER_EMAIL = "sample-owner@example.com";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

function check(result, what) {
    if (result.error) {
        throw new Error(`${what}: ${result.error.message}`);
    }

    return result.data;
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/£/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

function initials(name) {
    return name
        .split(/\s+/)
        .filter((word) => /^[a-z0-9]/i.test(word) && word.toLowerCase() !== "the")
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
}

function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

async function renderLogo(name, { color, accent }) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
            <rect width="512" height="512" rx="112" fill="${color}"/>
            <circle cx="256" cy="256" r="178" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="6"/>
            <text x="256" y="300" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
                font-size="168" font-weight="700" letter-spacing="-4" fill="${accent}">${initials(name)}</text>
        </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

async function upload(bucket, path, buffer, contentType) {
    check(
        await supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: true }),
        `upload ${bucket}/${path}`,
    );

    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function getSampleOwner() {
    const { users } = check(await supabase.auth.admin.listUsers({ perPage: 1000 }), "list users");
    const existing = users.find((user) => user.email === SAMPLE_OWNER_EMAIL);

    if (existing) {
        return existing.id;
    }

    const { user } = check(
        await supabase.auth.admin.createUser({
            email: SAMPLE_OWNER_EMAIL,
            password: randomBytes(24).toString("base64url"),
            email_confirm: true,
            user_metadata: { full_name: "Promotello sample data" },
        }),
        "create sample owner",
    );

    return user.id;
}

async function seed({ reset }) {
    check(await supabase.from("businesses").select("is_sample").limit(1), "is_sample column (run the sample_businesses migration)");

    const existing = check(
        await supabase.from("businesses").select("id").eq("is_sample", true),
        "find sample businesses",
    );

    if (existing.length > 0) {
        if (!reset) {
            console.log(`${existing.length} sample businesses already exist. Use "seed --reset" to replace them.`);
            return;
        }

        await remove();
    }

    const categories = check(await supabase.from("categories").select("id, slug"), "load categories (run the categories migration)");
    const categoryIds = Object.fromEntries(categories.map((category) => [category.slug, category.id]));
    const ownerId = await getSampleOwner();

    let offerCount = 0;

    for (const [index, sample] of sampleBusinesses.entries()) {
        const categoryId = categoryIds[sample.category];

        if (!categoryId) {
            throw new Error(`Unknown category "${sample.category}" for ${sample.name}`);
        }

        const business = check(
            await supabase
                .from("businesses")
                .insert({
                    name: sample.name,
                    category_id: categoryId,
                    description: sample.description,
                    website_url: sample.website_url ?? null,
                    approval_status: "approved",
                    created_by: ownerId,
                    is_sample: true,
                })
                .select("id")
                .single(),
            `create ${sample.name}`,
        );

        check(
            await supabase.from("business_members").insert({ business_id: business.id, user_id: ownerId, role: "owner" }),
            `owner for ${sample.name}`,
        );

        // Placeholder Pro subscription so the business can show several offers.
        check(
            await supabase.from("subscriptions").insert({
                business_id: business.id,
                stripe_subscription_id: `sub_sample_${business.id}`,
                stripe_customer_id: `cus_sample_${business.id}`,
                status: "active",
            }),
            `subscription for ${sample.name}`,
        );

        check(
            await supabase.from("business_locations").insert({
                business_id: business.id,
                name: "Main location",
                address_line_1: sample.street,
                city: "Bristol",
                region: sample.area.region,
                postal_code: sample.area.postal_code,
                country_code: "GB",
                latitude: sample.area.latitude,
                longitude: sample.area.longitude,
            }),
            `location for ${sample.name}`,
        );

        check(
            await supabase.from("business_hours").insert(
                sample.hours.map((times, day) => ({
                    business_id: business.id,
                    day_of_week: day,
                    is_closed: times === null,
                    opens_at: times?.[0] ?? null,
                    closes_at: times?.[1] ?? null,
                })),
            ),
            `hours for ${sample.name}`,
        );

        const logoUrl = await upload(
            "business-logos",
            `${business.id}/logo-sample.png`,
            await renderLogo(sample.name, sample.logo),
            "image/png",
        );

        check(
            await supabase.from("businesses").update({ logo_url: logoUrl }).eq("id", business.id),
            `logo for ${sample.name}`,
        );

        for (const [offerIndex, offer] of sample.offers.entries()) {
            const slug = `${slugify(offer.title)}-${randomBytes(3).toString("hex")}`;
            const imageUrl = await upload(
                "offer-images",
                `${business.id}/sample-${slug}.jpg`,
                await downloadUnsplashPhoto(offer.photo),
                "image/jpeg",
            );

            check(
                await supabase.from("offers").insert({
                    business_id: business.id,
                    created_by: ownerId,
                    slug,
                    title: offer.title,
                    discount: offer.discount,
                    description: offer.description,
                    availability: offer.availability,
                    // Spread expiry dates so "ending soon" has something to show.
                    expires_at: addDays(21 + ((index * 7 + offerIndex * 31) % 120)),
                    terms: "One per customer. Show your Promotello code before paying. Can't be combined with other offers.",
                    max_redemptions: offer.maxRedemptions ?? null,
                    redemption_count: 0,
                    image_url: imageUrl,
                    approval_status: "approved",
                }),
                `offer "${offer.title}"`,
            );

            offerCount += 1;
        }

        console.log(`✓ ${sample.name} (${sample.area.region}, ${sample.offers.length} ${sample.offers.length === 1 ? "offer" : "offers"})`);
    }

    console.log(`\nAdded ${sampleBusinesses.length} sample businesses and ${offerCount} offers.`);
}

async function removeFolder(bucket, folder) {
    const files = check(await supabase.storage.from(bucket).list(folder, { limit: 1000 }), `list ${bucket}/${folder}`);

    if (files.length > 0) {
        check(
            await supabase.storage.from(bucket).remove(files.map((file) => `${folder}/${file.name}`)),
            `remove ${bucket}/${folder}`,
        );
    }
}

async function remove() {
    const businesses = check(
        await supabase.from("businesses").select("id, name").eq("is_sample", true),
        "find sample businesses",
    );

    for (const business of businesses) {
        await removeFolder("business-logos", business.id);
        await removeFolder("offer-images", business.id);
        // Offers, locations, hours, members and subscriptions cascade.
        check(await supabase.from("businesses").delete().eq("id", business.id), `delete ${business.name}`);
    }

    const { users } = check(await supabase.auth.admin.listUsers({ perPage: 1000 }), "list users");
    const owner = users.find((user) => user.email === SAMPLE_OWNER_EMAIL);

    if (owner) {
        const others = check(
            await supabase.from("businesses").select("id").eq("created_by", owner.id),
            "check sample owner",
        );

        if (others.length === 0) {
            check(await supabase.auth.admin.deleteUser(owner.id), "delete sample owner");
        }
    }

    console.log(`Removed ${businesses.length} sample businesses.`);
}

const [command] = process.argv.slice(2);

try {
    if (command === "seed") {
        await seed({ reset: process.argv.includes("--reset") });
    } else if (command === "remove") {
        await remove();
    } else {
        console.log("Usage: node --env-file=.env.local scripts/sample-data.mjs <seed [--reset] | remove>");
        process.exitCode = 1;
    }
} catch (error) {
    console.error(`\nFailed: ${error.message}`);
    process.exitCode = 1;
}
