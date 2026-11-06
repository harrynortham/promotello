"use client";

import { FiImage } from "react-icons/fi";

import { ImagePicker } from "@/components/image-picker";
import { Button } from "@/components/ui/button";

// Every offer carries a picture. A listing is a wall of photographs, and
// a card without one is a flat tile beside them — so the field is
// required rather than hopeful.
//
// The requirement only works if it never sends anyone away to find a
// file, so the business's cover photo is offered as one tap. The
// checklist asks for that before the first offer, so most have one.
export function OfferImageField({
    coverImageUrl,
    savedImageUrl = null,
    usingCover,
    disabled = false,
    error,
    onChange,
    onUseCover,
    onRemove,
}: {
    coverImageUrl: string | null;
    // An image already on the offer, when one is being edited.
    savedImageUrl?: string | null;
    usingCover: boolean;
    disabled?: boolean;
    error?: string;
    onChange: (file: File | null, previewUrl: string | null) => void;
    onUseCover: () => void;
    onRemove?: () => void;
}) {
    return (
        <div className="space-y-3">
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
                imageUrl={usingCover ? coverImageUrl : savedImageUrl}
                // Cropped in a dialog: in a form this long, people were
                // choosing a photo and walking on without confirming it.
                modal
                disabled={disabled}
                error={error}
                onChange={onChange}
                onRemove={onRemove}
            />

            {coverImageUrl && !usingCover && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={onUseCover}
                >
                    <FiImage aria-hidden="true" />
                    Use my cover photo
                </Button>
            )}
        </div>
    );
}
