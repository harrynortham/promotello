"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiImage, FiUpload } from "react-icons/fi";

import { ImagePicker } from "@/components/image-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { uploadBusinessImage, type BusinessImageKind } from "@/lib/business-images";
import { createClient } from "@/utils/supabase/client";

const KINDS = {
    logo: {
        column: "logo_url",
        name: "logo",
        label: "Logo",
        aspect: 1,
        // A wide logo can sit in the square with space around it.
        allowSpace: true,
        maxSize: 1024,
        convertToJpeg: false,
        hint: "PNG, JPG or WebP. You can zoom and reposition it next.",
    },
    cover: {
        column: "cover_image_url",
        name: "cover photo",
        label: "Cover photo",
        aspect: 16 / 9,
        allowSpace: false,
        maxSize: 1600,
        convertToJpeg: true,
        hint: "A landscape JPG, PNG or WebP photo. You can zoom and reposition it next.",
    },
} as const;

// A business's logo or cover, shown small and changed in a dialog, so it can
// sit beside everything else rather than taking a page of its own.
export function BusinessImageDialog({
    kind,
    businessId,
    businessName,
    imageUrl,
}: {
    kind: BusinessImageKind;
    businessId: string;
    businessName: string;
    imageUrl: string | null;
}) {
    const config = KINDS[kind];
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    function close(open: boolean) {
        setIsOpen(open);

        if (!open) {
            setFile(null);
            setErrorMessage("");
        }
    }

    async function saveUrl(url: string | null) {
        const { error } = await createClient()
            .from("businesses")
            .update({ [config.column]: url })
            .eq("id", businessId);

        if (error) throw new Error(error.message);
    }

    async function save() {
        if (!file) return;

        setIsSaving(true);
        setErrorMessage("");

        try {
            const upload = await uploadBusinessImage(createClient(), businessId, kind, file);

            if ("error" in upload) {
                throw new Error(upload.error ?? `The ${config.name} couldn't be uploaded.`);
            }

            await saveUrl(upload.url);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : `The ${config.name} couldn't be saved.`);
            setIsSaving(false);
            return;
        }

        setIsSaving(false);
        close(false);
        router.refresh();
    }

    async function remove() {
        setIsSaving(true);
        setErrorMessage("");

        try {
            await saveUrl(null);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : `The ${config.name} couldn't be removed.`);
            setIsSaving(false);
            return;
        }

        setIsSaving(false);
        close(false);
        router.refresh();
    }

    return (
        <div className="flex items-center gap-4">
            <div
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#17233B]/10 bg-[#FFF8F0] ${
                    kind === "cover" ? "h-16 w-28" : "size-16"
                }`}
            >
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={`${businessName} ${config.name}`} className="size-full object-cover" />
                ) : (
                    <FiImage aria-hidden="true" className="size-6 text-[#17233B]/30" />
                )}
            </div>

            <div className="min-w-0">
                <p className="text-sm font-medium text-[#17233B]">{config.label}</p>
                <Button type="button" variant="outline" size="sm" className="mt-1.5" onClick={() => setIsOpen(true)}>
                    <FiUpload aria-hidden="true" />
                    {imageUrl ? "Change" : "Add"}
                </Button>
            </div>

            <Dialog open={isOpen} onOpenChange={close}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {imageUrl ? "Change" : "Add"} the {config.name}
                        </DialogTitle>
                        <DialogDescription>
                            {kind === "logo"
                                ? `Shown on ${businessName}'s page, its offers and its loyalty card.`
                                : `The big photo at the top of ${businessName}'s page and on its card in the directory.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-2">
                        <ImagePicker
                            id={`${kind}-picker`}
                            label={config.label}
                            hint={config.hint}
                            aspect={config.aspect}
                            allowSpace={config.allowSpace}
                            maxSize={config.maxSize}
                            convertToJpeg={config.convertToJpeg}
                            imageUrl={imageUrl}
                            disabled={isSaving}
                            onChange={(chosen) => setFile(chosen)}
                        />
                    </div>

                    {errorMessage && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertTitle>That didn&apos;t save</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        {imageUrl && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="sm:mr-auto"
                                disabled={isSaving}
                                onClick={remove}
                            >
                                Remove
                            </Button>
                        )}

                        <Button type="button" variant="outline" disabled={isSaving} onClick={() => close(false)}>
                            Cancel
                        </Button>

                        <Button type="button" disabled={isSaving || !file} onClick={save}>
                            {isSaving ? "Saving…" : `Save ${config.name}`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
