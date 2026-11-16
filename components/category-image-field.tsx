"use client";

import { useEffect, useRef, useState } from "react";

import { ImagePicker } from "@/components/image-picker";
import { uploadCategoryImage } from "@/lib/category-images";
import { createClient } from "@/utils/supabase/client";

// The picture on a category, chosen and cropped here rather than named
// as a URL somebody had to host elsewhere first.
//
// The upload happens as soon as the crop is confirmed, and what the
// surrounding server-action form submits is still a plain imageUrl
// field — so app/admin/categories/actions.ts reads exactly what it
// always read.
export function CategoryImageField({
    idPrefix,
    categoryId = null,
    savedImageUrl = null,
}: {
    idPrefix: string;
    // Null while a category is being created: it has no id to file the
    // picture under yet.
    categoryId?: string | null;
    savedImageUrl?: string | null;
}) {
    const [url, setUrl] = useState(savedImageUrl ?? "");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const hiddenRef = useRef<HTMLInputElement>(null);

    // Saving mid-upload would quietly store the picture that was there
    // before — the form would say it saved, and the old image would
    // still be on the category. Hold the submit instead of letting it
    // through with stale contents.
    useEffect(() => {
        const form = hiddenRef.current?.form;
        if (!form) return;

        const hold = (event: SubmitEvent) => {
            if (!uploading) return;
            event.preventDefault();
            setError("The image is still uploading. Try again in a moment.");
        };

        form.addEventListener("submit", hold);
        return () => form.removeEventListener("submit", hold);
    }, [uploading]);

    async function choose(file: File | null) {
        if (!file) return;

        setError("");
        setUploading(true);

        const result = await uploadCategoryImage(createClient(), categoryId, file);

        setUploading(false);

        if (result.error || !result.url) {
            setError(result.error ?? "That image could not be uploaded.");
            return;
        }

        setUrl(result.url);
    }

    return (
        <div className="space-y-2">
            {/* What the server action reads. */}
            <input ref={hiddenRef} type="hidden" name="imageUrl" value={url} readOnly />

            <ImagePicker
                id={`${idPrefix}-image`}
                label="Image"
                hint="A landscape JPG, PNG or WebP. You can zoom and reposition it next."
                aspect={16 / 10}
                maxSize={1600}
                convertToJpeg
                imageUrl={url || null}
                modal
                disabled={uploading}
                error={error}
                onChange={(file) => void choose(file)}
                onRemove={() => {
                    setUrl("");
                    setError("");
                }}
            />

            {uploading && (
                <p className="text-sm text-[#17233B]/65" role="status">
                    Uploading…
                </p>
            )}
        </div>
    );
}
