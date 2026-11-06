"use client";

import { ImagePicker } from "@/components/image-picker";

// Every offer carries a picture of its own. A listing is a wall of
// photographs, and a card without one is a flat tile beside them — so
// the field is required rather than hopeful.
export function OfferImageField({
    savedImageUrl = null,
    disabled = false,
    error,
    onChange,
    onRemove,
}: {
    // An image already on the offer, when one is being edited.
    savedImageUrl?: string | null;
    disabled?: boolean;
    error?: string;
    onChange: (file: File | null, previewUrl: string | null) => void;
    onRemove?: () => void;
}) {
    return (
        <ImagePicker
            id="image"
            label={
                <>
                    Offer image <span className="text-[#FF593F]">*</span>
                </>
            }
            hint="A landscape JPG, PNG or WebP photo. You can zoom and reposition it next."
            aspect={16 / 10}
            maxSize={1600}
            convertToJpeg
            imageUrl={savedImageUrl}
            // Cropped in a dialog: in a form this long, people were
            // choosing a photo and walking on without confirming it.
            modal
            disabled={disabled}
            error={error}
            onChange={onChange}
            onRemove={onRemove}
        />
    );
}
