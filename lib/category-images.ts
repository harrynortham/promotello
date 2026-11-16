import type { createClient } from "@/utils/supabase/client";

// The picture on a category, uploaded from /admin/categories into the
// bucket 20270122090000_a_category_picture_is_uploaded.sql makes. Its
// policies allow writes only from a platform admin, which is the same
// gate the categories table uses.
const BUCKET = "category-images";

function extensionFor(type: string) {
    if (type === "image/png") return "png";
    if (type === "image/webp") return "webp";
    return "jpg";
}

// A folder per category, so the pictures a category has had sit
// together. A category being created has no id yet, and "new" is the
// folder they land in until it does — nothing reads the path, so this
// is only for anybody later looking in the bucket.
export async function uploadCategoryImage(
    supabase: ReturnType<typeof createClient>,
    categoryId: string | null,
    file: File,
) {
    const path = `${categoryId ?? "new"}/${Date.now()}.${extensionFor(file.type)}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return { error: error.message };

    return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}
