"use client";

import { useState } from "react";

import { ImagePicker } from "@/components/image-picker";
import { imageProblem } from "@/components/offer-fields";
import { createClient } from "@/utils/supabase/client";

// The picture that goes out with the gift. The form around it is a plain
// server action, so the file is uploaded here and only its URL is posted
// -- the same bucket and the same folder an offer's photograph uses, so
// the policy that already guards it (owner or admin of this business)
// guards this too.
export function GiftImageField({
    businessId,
    kind,
    savedImageUrl,
    disabled,
}: {
    businessId: string;
    kind: string;
    savedImageUrl: string | null;
    disabled: boolean;
}) {
    const [imageUrl, setImageUrl] = useState(savedImageUrl);
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);

    async function onChange(file: File | null) {
        if (!file) return;

        const problem = imageProblem(file);

        if (problem) {
            setError(problem);
            return;
        }

        setError(undefined);
        setBusy(true);

        const supabase = createClient();
        const extension = file.name.split(".").pop() ?? "jpg";
        const path = `${businessId}/automation-${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from("offer-images")
            .upload(path, file, { upsert: false, contentType: file.type });

        setBusy(false);

        if (uploadError) {
            // Said here rather than swallowed: the Save button would
            // otherwise report success for a picture that never arrived.
            setError("That image didn't upload. Please try again.");
            return;
        }

        setImageUrl(supabase.storage.from("offer-images").getPublicUrl(path).data.publicUrl);
    }

    return (
        <>
            <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
            <ImagePicker
                id={`${kind}-image`}
                label="Picture (optional)"
                hint={busy ? "Uploading…" : "A landscape photo of what they get. Shown in the email and when staff scan it."}
                aspect={16 / 10}
                maxSize={1600}
                convertToJpeg
                modal
                imageUrl={imageUrl}
                disabled={disabled || busy}
                error={error}
                onChange={onChange}
                onRemove={() => setImageUrl(null)}
            />
        </>
    );
}
