import type { createClient } from "@/utils/supabase/client";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

// A business's logo or cover photo. Both are cropped and resized in the
// browser, so a big phone photo is fine to choose; the upload is much smaller.
export type BusinessImageKind = "logo" | "cover";

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
    kind: BusinessImageKind,
    file: File,
) {
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/${kind}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return { error: error.message };

    return { url: supabase.storage.from("business-logos").getPublicUrl(path).data.publicUrl };
}
