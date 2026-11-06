"use client";

import { useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { FiImage, FiUpload } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/field-error";
import { ImageCropper, cropImage } from "@/components/image-cropper";
import { Label } from "@/components/ui/label";
import { IMAGE_ACCEPT, imageFileError } from "@/lib/business-images";

// The choose-and-crop step used for business logos and cover photos
// (components/business-image-form.tsx), as a field inside a bigger form.
// It hands the parent a cropped File to upload when that form is submitted,
// so a big phone photo is fine to choose.
export function ImagePicker({
    id,
    label,
    hint,
    aspect = 1,
    allowSpace = false,
    maxSize = 1600,
    convertToJpeg = false,
    imageUrl = null,
    modal = false,
    disabled = false,
    error,
    onChange,
    onRemove,
}: {
    id: string;
    // A node, so a required field can carry its asterisk.
    label: React.ReactNode;
    hint: string;
    aspect?: number;
    // Zooming out below 1 leaves space around the image, for a wide logo.
    allowSpace?: boolean;
    // The longest edge of the cropped image, in pixels.
    maxSize?: number;
    // Photos become JPEG to keep them small; leave off to keep PNG or
    // WebP transparency.
    convertToJpeg?: boolean;
    // An image already saved, shown until a new one is chosen.
    imageUrl?: string | null;
    // Crop in a dialog rather than in place. Inside a long form the
    // cropper is easy to walk away from: the field looks finished while
    // the image is still sitting unconfirmed. A dialog has to be
    // answered. Not for a picker that is already inside a dialog.
    modal?: boolean;
    disabled?: boolean;
    error?: string;
    onChange: (file: File | null, previewUrl: string | null) => void;
    // Given when a saved image can be cleared, not just replaced.
    onRemove?: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [chosen, setChosen] = useState<File | null>(null);
    const [chosenUrl, setChosenUrl] = useState<string | null>(null);
    const [cropArea, setCropArea] = useState<Area | null>(null);
    const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
    const [fileError, setFileError] = useState("");
    const [isCropping, setIsCropping] = useState(false);
    const [isRemoved, setIsRemoved] = useState(false);

    // Free each preview once it's replaced or the form closes.
    useEffect(() => () => {
        if (chosenUrl) URL.revokeObjectURL(chosenUrl);
    }, [chosenUrl]);

    useEffect(() => () => {
        if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    }, [croppedUrl]);

    function chooseFile(file: File | null) {
        // Let the same file be picked again after "Choose another".
        if (inputRef.current) inputRef.current.value = "";
        if (!file) return;

        const problem = imageFileError(file);
        setFileError(problem ?? "");
        if (problem) return;

        setChosen(file);
        setChosenUrl(URL.createObjectURL(file));
        setCropArea(null);
        setIsCropping(true);
    }

    function cancelCrop() {
        setChosen(null);
        setChosenUrl(null);
        setCropArea(null);
        setIsCropping(false);
    }

    async function useThisImage() {
        if (!chosen || !chosenUrl || !cropArea) return;

        const type = convertToJpeg || chosen.type === "image/jpeg" ? "image/jpeg" : chosen.type;

        try {
            const blob = await cropImage(chosenUrl, cropArea, { type, maxSize });
            const name = chosen.name.replace(/\.[^.]+$/, "") + (type === "image/jpeg" ? ".jpg" : "");

            const url = URL.createObjectURL(blob);

            setCroppedUrl(url);
            onChange(new File([blob], name || chosen.name, { type }), url);
            setIsRemoved(false);
            setFileError("");
        } catch {
            setFileError("That image couldn't be prepared. Please choose another.");
            return;
        }

        setChosen(null);
        setChosenUrl(null);
        setIsCropping(false);
    }

    function remove() {
        setCroppedUrl(null);
        setFileError("");
        setIsRemoved(true);
        onChange(null, null);
        onRemove?.();
    }

    // Shared by both shapes: the same cropper, the same two answers.
    const cropControls = (
        <>
            <Button
                type="button"
                variant="outline"
                size="lg"
                className="sm:flex-1"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
            >
                Choose another
            </Button>

            <Button
                type="button"
                size="lg"
                className="sm:flex-1"
                disabled={disabled || !cropArea}
                onClick={useThisImage}
            >
                Use this image
            </Button>
        </>
    );

    if (!modal && isCropping && chosenUrl) {
        return (
            <div className="space-y-4">
                <Label htmlFor={id}>{label}</Label>

                <ImageCropper
                    src={chosenUrl}
                    aspect={aspect}
                    allowSpace={allowSpace}
                    onCropChange={setCropArea}
                />

                <FieldError id={`${id}-error`} message={fileError || undefined} />

                <div className="flex flex-col-reverse gap-3 sm:flex-row">{cropControls}</div>

                <button
                    type="button"
                    onClick={cancelCrop}
                    disabled={disabled}
                    className="mx-auto block cursor-pointer text-sm text-[#17233B]/65 underline-offset-4 hover:underline"
                >
                    Cancel
                </button>

                <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                />
            </div>
        );
    }

    const preview = croppedUrl ?? (isRemoved ? null : imageUrl);

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div
                    className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#17233B]/10 bg-[#FFF8F0]"
                    style={{ width: 128, height: Math.round(128 / aspect) }}
                >
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" className="size-full object-cover" />
                    ) : (
                        <FiImage aria-hidden="true" className="size-8 text-[#17233B]/30" />
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            size="lg"
                            variant={preview ? "outline" : "default"}
                            disabled={disabled}
                            onClick={() => inputRef.current?.click()}
                            aria-describedby={`${id}-hint`}
                        >
                            <FiUpload aria-hidden="true" />
                            {preview ? "Change image" : "Upload from device"}
                        </Button>

                        {preview && (croppedUrl || onRemove) && (
                            <button
                                type="button"
                                onClick={remove}
                                disabled={disabled}
                                className="cursor-pointer text-sm text-[#17233B]/65 underline-offset-4 hover:underline"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    <p id={`${id}-hint`} className="text-xs text-[#17233B]/65">
                        {hint}
                    </p>
                </div>
            </div>

            <FieldError id={`${id}-error`} message={fileError || error} />

            <input
                ref={inputRef}
                id={id}
                type="file"
                accept={IMAGE_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />

            {modal && (
                <Dialog
                    open={isCropping && chosenUrl !== null}
                    onOpenChange={(open) => {
                        // Closing it any way at all — the cross, Escape,
                        // the backdrop — is answering "not this one".
                        if (!open) cancelCrop();
                    }}
                >
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Position your image</DialogTitle>

                            <DialogDescription>
                                Drag to move it and zoom to fill the frame. It is
                                saved to the form when you choose Use this image.
                            </DialogDescription>
                        </DialogHeader>

                        {chosenUrl && (
                            <ImageCropper
                                src={chosenUrl}
                                aspect={aspect}
                                allowSpace={allowSpace}
                                onCropChange={setCropArea}
                            />
                        )}

                        <FieldError id={`${id}-crop-error`} message={fileError || undefined} />

                        <DialogFooter className="flex-col-reverse gap-3 sm:flex-row">
                            {cropControls}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
