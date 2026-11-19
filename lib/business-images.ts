import type { createClient } from "@/utils/supabase/client";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

// A business's logo or cover photo. Both are cropped and resized in the
// browser, so a big phone photo is fine to choose; the upload is much
// smaller.
//
// These two are the ones with a column of their own on businesses, and
// the forms that edit them are keyed by this. A gallery photo is a row
// in business_photos rather than a column, so it is not one of these —
// it is only the same upload.
export type BusinessImageKind = "logo" | "cover";

export type UploadKind = BusinessImageKind | "photo";

const MAX_CHOSEN_MB = 20;

// The message to show for a file we can't take, or null if it's fine.
export function imageFileError(file: File) {
    if (!IMAGE_TYPES.includes(file.type)) return "Please choose a PNG, JPG or WebP image.";
    if (file.size > MAX_CHOSEN_MB * 1024 * 1024) return `The image must be smaller than ${MAX_CHOSEN_MB}MB.`;
    return null;
}

// Uploads to the business's folder in business-logos, which its storage
// policies limit to the business's owners and admins.
export async function uploadBusinessImage(
    supabase: ReturnType<typeof createClient>,
    businessId: string,
    kind: UploadKind,
    file: File,
    { generated = false }: { generated?: boolean } = {},
) {
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/${generated ? GENERATED_PREFIX : kind}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return { error: error.message };

    return {
        path,
        url: supabase.storage.from("business-logos").getPublicUrl(path).data.publicUrl,
    };
}

// A cover we drew is a stand-in until the business sends a photograph,
// and the setup steps should say so rather than tick a box nobody
// ticked.
//
// Told apart by the name it was stored under, not by a column beside
// it. Four places write cover_image_url and all four do it the same
// way, `{ [column]: url }`, for a logo and a cover alike — a flag in a
// second column would have to be cleared in every one of them, and the
// fifth place somebody adds would forget. Then a business that sent a
// real photo would be chased for one forever, which is worse than the
// ugliness of reading a filename.
//
// This cannot drift: replacing the cover replaces the url, and the
// answer changes with it.
const GENERATED_PREFIX = "cover-generated";

export function isGeneratedCover(url: string | null | undefined) {
    return typeof url === "string" && url.includes(`/${GENERATED_PREFIX}-`);
}

// What the business actually sent us, as opposed to what we drew for
// them. Null for both "nothing" and "only a placeholder", which is the
// question every setup step is really asking.
export function uploadedCover(url: string | null | undefined) {
    return url && !isGeneratedCover(url) ? url : null;
}
