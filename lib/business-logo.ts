import type { createClient } from "@/utils/supabase/client";

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_ACCEPT = LOGO_TYPES.join(",");

// The message to show for a logo file we can't take, or null if it's fine.
export function logoFileError(file: File) {
    if (!LOGO_TYPES.includes(file.type)) return "Please upload a PNG, JPG or WebP image.";
    if (file.size > 5 * 1024 * 1024) return "The logo must be smaller than 5MB.";
    return null;
}

export async function uploadLogo(supabase: ReturnType<typeof createClient>, businessId: string, file: File) {
    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${businessId}/logo-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return { error: error.message };

    return { url: supabase.storage.from("business-logos").getPublicUrl(path).data.publicUrl };
}
