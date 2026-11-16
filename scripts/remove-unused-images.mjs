// Files in storage that nothing points at any more.
//
// Deleting a business row does not remove its pictures: storage has no
// foreign key back to the database, so every business deleted leaves its
// logo, its cover photo and its offers' photographs behind. Nothing
// breaks, it just accumulates.
//
// THE RULE IS "NOTHING REFERENCES IT", NEVER "THE BUSINESS IS GONE".
//
// That distinction is the whole of this script. A business an owner
// closes keeps its row — closed_at is set and the page comes down, but
// logo_url and cover_image_url still hold their URLs, and reopening it
// puts the same page back (`reopenBusiness`). If this deleted by
// business state it would strip the pictures off every closed business
// and they would come back blank. Because it asks instead whether any
// row anywhere still names the file, a closed business keeps everything
// by construction, and so does a business suspended, rejected, pending,
// or in any state we invent later.
//
// Where a reference can live, all of which are read below:
//
//   businesses.logo_url, businesses.cover_image_url  → business-logos
//   offers.image_url                                 → offer-images
//   auth.users metadata avatar_path                  → profile-images
//
// The first two hold full public URLs; the third holds a bare path.
// categories.image_url and cities.hero_image_url point outside our
// buckets, and are read anyway in case that ever changes.
//
// Run it with
//   node scripts/remove-unused-images.mjs            # says what it would do
//   node scripts/remove-unused-images.mjs --write    # does it
//
// Deleting a file is final. There is no recycle bin in Supabase storage.

import { createClient } from "@supabase/supabase-js";

const write = process.argv.includes("--write");

// A file is uploaded before the row that names it is saved
// (`uploadBusinessImage`, then `saveUrl`). Between those two a file is
// genuinely unreferenced and genuinely wanted, so anything recent is
// left alone — a save in flight, or a person who has walked away
// mid-crop and will come back to it.
const MIN_AGE_HOURS = 24;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed.");
    process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKETS = ["business-logos", "offer-images", "profile-images"];

// The path inside a bucket, from a full public URL. The bucket is read
// out of the URL rather than guessed, so a logo can never be counted as
// protecting a file of the same name in another bucket.
function pathFromUrl(value) {
    if (typeof value !== "string") return null;

    const marker = "/storage/v1/object/public/";
    const at = value.indexOf(marker);

    if (at === -1) return null;

    const rest = value.slice(at + marker.length);
    const slash = rest.indexOf("/");

    if (slash === -1) return null;

    return { bucket: rest.slice(0, slash), path: decodeURIComponent(rest.slice(slash + 1)) };
}

// A bare path, which is only ever how an avatar is kept
// (user_metadata.avatar_path, read by lib/user-profile.ts). Anything
// with a scheme is somebody else's host — a Google avatar, for one.
function avatarPath(value) {
    if (typeof value !== "string") return null;

    const path = value.trim().replace(/^profile-images\//, "");

    return path === "" || path.includes("://") ? null : path;
}

async function everythingReferenced() {
    const referenced = Object.fromEntries(BUCKETS.map((bucket) => [bucket, new Set()]));
    let found = 0;

    const add = (value) => {
        const held = pathFromUrl(value);

        // A bucket we don't sweep is not an error: it is a picture
        // somewhere else, and none of our business.
        if (held && referenced[held.bucket]) {
            referenced[held.bucket].add(held.path);
            found += 1;
        }
    };

    const [businesses, offers, categories, cities] = await Promise.all([
        db.from("businesses").select("logo_url, cover_image_url"),
        db.from("offers").select("image_url"),
        db.from("categories").select("image_url"),
        db.from("cities").select("hero_image_url, feature_image_url"),
    ]);

    for (const result of [businesses, offers, categories, cities]) {
        if (result.error) throw new Error(`Could not read references: ${result.error.message}`);
    }

    for (const row of businesses.data ?? []) {
        add(row.logo_url);
        add(row.cover_image_url);
    }
    for (const row of offers.data ?? []) add(row.image_url);
    for (const row of categories.data ?? []) add(row.image_url);
    for (const row of cities.data ?? []) {
        add(row.hero_image_url);
        add(row.feature_image_url);
    }

    // Avatars live in user metadata, not in a table.
    for (let page = 1; ; page += 1) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new Error(`Could not read accounts: ${error.message}`);
        if (!data.users.length) break;

        for (const user of data.users) {
            // avatar_url is whatever the sign-in provider gave us, so it
            // is usually Google's and not ours. Read as a URL in case
            // somebody's is, and as a path only for avatar_path.
            add(user.user_metadata?.avatar_url);

            const avatar = avatarPath(user.user_metadata?.avatar_path);

            if (avatar) {
                referenced["profile-images"].add(avatar);
                found += 1;
            }
        }

        if (data.users.length < 200) break;
    }

    return { referenced, found };
}

// Every object in a bucket, folders and all.
async function everythingStored(bucket, prefix = "") {
    const files = [];

    for (let offset = 0; ; offset += 100) {
        const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 100, offset });

        if (error) throw new Error(`Could not list ${bucket}/${prefix}: ${error.message}`);
        if (!data.length) break;

        for (const entry of data) {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name;

            // A folder comes back with no id.
            if (entry.id === null) files.push(...(await everythingStored(bucket, path)));
            else files.push({ path, created_at: entry.created_at, size: entry.metadata?.size ?? 0 });
        }

        if (data.length < 100) break;
    }

    return files;
}

const { referenced, found } = await everythingReferenced();

console.log(`${found} reference${found === 1 ? "" : "s"} found in the database.\n`);

const cutoff = Date.now() - MIN_AGE_HOURS * 60 * 60 * 1000;
let deleted = 0;
let freed = 0;

for (const bucket of BUCKETS) {
    const stored = await everythingStored(bucket);
    const inUse = referenced[bucket];

    const unused = stored.filter((file) => !inUse.has(file.path));
    const tooNew = unused.filter((file) => new Date(file.created_at).getTime() > cutoff);
    const goable = unused.filter((file) => new Date(file.created_at).getTime() <= cutoff);

    console.log(
        `${bucket}: ${stored.length} file${stored.length === 1 ? "" : "s"}, ` +
            `${inUse.size} in use, ${goable.length} unused` +
            (tooNew.length ? `, ${tooNew.length} too recent to judge` : ""),
    );

    // Nothing referenced but plenty stored means the read above went
    // wrong, not that every picture is unused. Deleting on that reading
    // would empty the bucket.
    if (stored.length > 0 && inUse.size === 0 && found === 0) {
        console.error("  ! No references read at all — refusing to touch this bucket.");
        continue;
    }

    for (const file of goable) {
        const size = `${(file.size / 1024).toFixed(0)}KB`;

        if (!write) {
            console.log(`    would delete ${file.path} (${size})`);
            continue;
        }

        const { error } = await db.storage.from(bucket).remove([file.path]);

        if (error) {
            console.log(`    ! ${file.path}: ${error.message}`);
            continue;
        }

        console.log(`    deleted ${file.path} (${size})`);
        deleted += 1;
        freed += file.size;
    }
}

console.log(
    write
        ? `\nDeleted ${deleted} file${deleted === 1 ? "" : "s"}, ${(freed / 1024 / 1024).toFixed(1)}MB.`
        : "\nNothing was changed. Pass --write to delete.",
);
