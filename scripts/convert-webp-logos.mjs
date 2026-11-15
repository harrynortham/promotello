// One-off: the logos uploaded as WebP before the cropper stopped making
// them.
//
// Outlook on Windows renders mail through Word, which has never
// supported WebP, so a .webp logo arrives in an email as a red cross.
// lib/email.ts refuses to send one — a business with one of these gets
// its initials in every email instead of its logo, which is tidy but is
// not their logo. components/image-cropper.tsx stops new ones being
// made; this is for the ones already there.
//
// It converts to JPEG rather than PNG on purpose: a file's type says it
// *can* carry transparency, not that it does. Both of ours are fully
// opaque, and as PNG they came out four and eight times bigger. Any that
// do have transparency are converted to PNG instead and keep it.
//
// Writes to the live database. Run it with
//   node scripts/convert-webp-logos.mjs            # says what it would do
//   node scripts/convert-webp-logos.mjs --write    # does it
//
// The old file is left in storage either way, so the only thing that
// changes is which URL the row points at — put the old URL back and the
// old logo is still there.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const write = process.argv.includes("--write");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed.");
    process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "business-logos";

const { data: businesses, error } = await db
    .from("businesses")
    .select("id, name, logo_url")
    .ilike("logo_url", "%.webp");

if (error) {
    console.error("Could not read the businesses:", error.message);
    process.exit(1);
}

if (!businesses?.length) {
    console.log("No WebP logos left.");
    process.exit(0);
}

console.log(`${businesses.length} to convert${write ? "" : " (dry run — pass --write to do it)"}\n`);

for (const business of businesses) {
    // The path inside the bucket, from the public URL the row holds.
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const at = business.logo_url.indexOf(marker);

    if (at === -1) {
        console.log(`! ${business.name}: not a ${BUCKET} URL, skipped`);
        continue;
    }

    const path = business.logo_url.slice(at + marker.length);
    const { data: file, error: readError } = await db.storage.from(BUCKET).download(path);

    if (readError || !file) {
        console.log(`! ${business.name}: could not download, skipped (${readError?.message})`);
        continue;
    }

    const original = Buffer.from(await file.arrayBuffer());
    const { hasAlpha } = await sharp(original).metadata();

    // Transparency is the only reason to pay for PNG.
    const converted = hasAlpha
        ? await sharp(original).png({ compressionLevel: 9 }).toBuffer()
        : await sharp(original).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();

    const extension = hasAlpha ? "png" : "jpg";
    const contentType = hasAlpha ? "image/png" : "image/jpeg";
    const next = path.replace(/\.webp$/i, `.${extension}`);

    const sizes = `${(original.length / 1024).toFixed(0)}KB webp → ${(converted.length / 1024).toFixed(0)}KB ${extension}`;

    if (!write) {
        console.log(`  ${business.name}: ${sizes}${hasAlpha ? " (has transparency)" : ""}`);
        continue;
    }

    const { error: uploadError } = await db.storage
        .from(BUCKET)
        .upload(next, converted, { contentType, upsert: true });

    if (uploadError) {
        console.log(`! ${business.name}: could not upload, skipped (${uploadError.message})`);
        continue;
    }

    const { data: published } = db.storage.from(BUCKET).getPublicUrl(next);

    const { error: saveError } = await db
        .from("businesses")
        .update({ logo_url: published.publicUrl })
        .eq("id", business.id);

    if (saveError) {
        console.log(`! ${business.name}: converted but could not save the URL (${saveError.message})`);
        continue;
    }

    console.log(`  ${business.name}: ${sizes} — saved`);
}

console.log(write ? "\nDone." : "\nNothing was changed.");
