"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImagePicker } from "@/components/image-picker";
import { isGeneratedCover, uploadBusinessImage } from "@/lib/business-images";
import { storedImage } from "@/lib/images";
import { createClient } from "@/utils/supabase/client";

// The photo, changeable after the build.
//
// A preview built one at a time can have a photo put on it; one
// published in bulk down a street cannot, and that is most of them. So
// they get the cover we draw from their colours, which is fine as a
// page header and wrong as an offer card -- the directory draws that
// card with this same image, and a flat panel with the business name on
// it does not look like something to walk in for.
//
// Nothing is minted or re-sent by this. The token stays, so a link
// already in somebody's DMs keeps working and simply looks better.

export function PreviewPhotoForm({
    businessId,
    coverUrl,
}: {
    businessId: string;
    coverUrl: string | null;
}) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState<string | null>(null);

    const drawn = isGeneratedCover(coverUrl);
    const shown = storedImage(coverUrl);

    async function choose(file: File | null) {
        if (!file) return;

        setSaving(true);
        setFailed(null);

        const supabase = createClient();
        const upload = await uploadBusinessImage(supabase, businessId, "cover", file);

        if ("error" in upload) {
            setFailed(upload.error ?? "That image didn't upload.");
            setSaving(false);
            return;
        }

        // The upload on its own changes nothing anybody can see: the
        // url has to go onto the business for the page to pick it up.
        //
        // Through a function, not an update. RLS would allow the
        // update -- whoever built the preview owns the business -- but
        // it has nothing to say about whether the page has since been
        // claimed, and that is the thing that decides it.
        const { data: done, error } = await supabase.rpc("set_preview_cover", {
            requested_business_id: businessId,
            image_url: upload.url,
        });

        setSaving(false);

        if (error || !done) {
            setFailed(error?.message ?? "That photo wasn't saved. The page may have been claimed.");
            return;
        }

        router.refresh();
    }

    return (
        <div className="space-y-3 border-t pt-4">
            <p className="text-xs uppercase tracking-wide text-[#17233B]/55">The photo on it</p>

            {shown && (
                <div className="flex items-start gap-3">
                    <Image
                        src={shown}
                        alt=""
                        width={160}
                        height={90}
                        className="w-28 rounded-lg border border-[#17233B]/10 object-cover"
                    />
                    <p className="text-xs leading-5 text-[#17233B]/55">
                        {drawn
                            ? "Drawn from their colours. It works as a page header and reads oddly as an offer card, which uses the same picture."
                            : "A real photo, so the offer card has something to show."}
                    </p>
                </div>
            )}

            <ImagePicker
                id="preview-photo"
                label={shown ? "Replace it" : "Photo of the place"}
                hint="A landscape photo. You can zoom and reposition it."
                aspect={16 / 9}
                maxSize={1600}
                convertToJpeg
                modal
                disabled={saving}
                onChange={choose}
            />

            {saving && <p className="text-xs text-[#17233B]/55">Saving the photo…</p>}

            {failed && (
                <p role="alert" className="text-xs text-red-700">
                    {failed}
                </p>
            )}
        </div>
    );
}
