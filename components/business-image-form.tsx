"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Area } from "react-easy-crop";
import { FiImage, FiUpload } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/field-error";
import { ImageCropper, cropImage } from "@/components/image-cropper";
import { IMAGE_ACCEPT, imageFileError, uploadBusinessImage, type BusinessImageKind } from "@/lib/business-images";
import { createClient } from "@/utils/supabase/client";

const KINDS = {
    logo: {
        column: "logo_url",
        name: "logo",
        aspect: 1,
        // A wide logo can sit in the square with space around it.
        allowSpace: true,
        maxSize: 1024,
        intro: (business: string) =>
            `It shows on your page, your offers and your loyalty card, so customers recognise ${business}.`,
        hint: "PNG, JPG or WebP. You can zoom and reposition it next.",
    },
    cover: {
        column: "cover_image_url",
        name: "cover photo",
        aspect: 16 / 9,
        allowSpace: false,
        maxSize: 1600,
        intro: (business: string) =>
            `The big photo at the top of ${business}'s page and on its card in the directory. Your shop front, counter or best dish works well.`,
        hint: "A landscape JPG, PNG or WebP photo. You can zoom and reposition it next.",
    },
} as const;

export function BusinessImageForm({
    kind,
    businessId,
    businessName,
    imageUrl,
    returnTo,
}: {
    kind: BusinessImageKind;
    businessId: string;
    businessName: string;
    imageUrl: string | null;
    // Where Back and saving go: Edit business when they came from there.
    returnTo?: string;
}) {
    const config = KINDS[kind];
    const router = useRouter();
    const back = returnTo ?? `/business/${businessId}`;
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cropArea, setCropArea] = useState<Area | null>(null);
    const [fileError, setFileError] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Free each preview once it's replaced or the page closes.
    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    function chooseFile(chosen: File | null) {
        // Let the same file be picked again after "Choose another".
        if (inputRef.current) inputRef.current.value = "";
        if (!chosen) return;

        setErrorMessage("");
        const problem = imageFileError(chosen);
        setFileError(problem ?? "");
        if (problem) return;

        setFile(chosen);
        setCropArea(null);
        setPreviewUrl(URL.createObjectURL(chosen));
    }

    function startOver() {
        setFile(null);
        setPreviewUrl(null);
        setCropArea(null);
        setErrorMessage("");
    }

    async function saveUrl(url: string | null) {
        const { error } = await createClient()
            .from("businesses")
            .update({ [config.column]: url })
            .eq("id", businessId);
        if (error) throw new Error(error.message);
    }

    function done() {
        // Back where they came from: the setup steps tick this off.
        router.push(back);
        router.refresh();
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!file || !previewUrl || !cropArea) return;

        setIsSaving(true);
        setErrorMessage("");

        try {
            // Photos become JPEG to keep them small; a logo keeps PNG or WebP transparency.
            const type = kind === "cover" || file.type === "image/jpeg" ? "image/jpeg" : file.type;
            const blob = await cropImage(previewUrl, cropArea, { type, maxSize: config.maxSize });
            const upload = await uploadBusinessImage(createClient(), businessId, kind, new File([blob], file.name, { type }));

            if ("error" in upload) {
                throw new Error(upload.error ?? `The ${config.name} couldn't be uploaded.`);
            }

            await saveUrl(upload.url);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : `The ${config.name} couldn't be saved.`);
            setIsSaving(false);
            return;
        }

        done();
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
        done();
    }

    const title = `${imageUrl ? "Change" : "Add"} your ${config.name}`;

    return (
        <div className="text-[#17233B]">
            <div>
                <BackButton href={back} />

                <div className="mt-8">
                    <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
                    <p className="mt-3 text-[#17233B]/65">{config.intro(businessName)}</p>
                </div>

                <Card className="mt-10 border-[#17233B]/10">
                    <CardContent className="p-6 sm:p-10">
                        <input
                            ref={inputRef}
                            id={kind}
                            type="file"
                            accept={IMAGE_ACCEPT}
                            className="sr-only"
                            tabIndex={-1}
                            aria-hidden="true"
                            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                        />

                        {file && previewUrl ? (
                            <form onSubmit={save} noValidate className="space-y-6">
                                <ImageCropper
                                    src={previewUrl}
                                    aspect={config.aspect}
                                    allowSpace={config.allowSpace}
                                    onCropChange={setCropArea}
                                />

                                {errorMessage && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Unable to save your {config.name}</AlertTitle>
                                        <AlertDescription>{errorMessage}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        className="sm:flex-1"
                                        disabled={isSaving}
                                        onClick={() => inputRef.current?.click()}
                                    >
                                        Choose another
                                    </Button>

                                    <Button type="submit" size="lg" className="sm:flex-1" disabled={isSaving || !cropArea}>
                                        {isSaving ? `Saving ${config.name}…` : `Save ${config.name}`}
                                    </Button>
                                </div>

                                <button
                                    type="button"
                                    onClick={startOver}
                                    disabled={isSaving}
                                    className="mx-auto block cursor-pointer text-sm text-[#17233B]/65 underline-offset-4 hover:underline"
                                >
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <div className="flex flex-col items-center gap-6 text-center">
                                <div
                                    className={`flex items-center justify-center overflow-hidden rounded-2xl border border-[#17233B]/10 bg-[#FFF8F0] ${kind === "cover" ? "aspect-video w-full" : "size-32"}`}
                                >
                                    {imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={imageUrl} alt={`${businessName} ${config.name}`} className="size-full object-cover" />
                                    ) : (
                                        <FiImage aria-hidden="true" className="size-10 text-[#17233B]/30" />
                                    )}
                                </div>

                                {errorMessage && (
                                    <Alert variant="destructive" className="text-left">
                                        <AlertTitle>Unable to remove your {config.name}</AlertTitle>
                                        <AlertDescription>{errorMessage}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={() => inputRef.current?.click()}
                                        aria-describedby={fileError ? `${kind}-error ${kind}-hint` : `${kind}-hint`}
                                    >
                                        <FiUpload aria-hidden="true" />
                                        Upload from device
                                    </Button>

                                    <FieldError id={`${kind}-error`} message={fileError || undefined} />
                                    <p id={`${kind}-hint`} className="text-xs text-[#17233B]/65">
                                        {config.hint}
                                    </p>
                                </div>

                                {imageUrl && kind === "cover" && (
                                    <button
                                        type="button"
                                        onClick={remove}
                                        disabled={isSaving}
                                        className="cursor-pointer text-sm text-[#17233B]/65 underline-offset-4 hover:underline"
                                    >
                                        {isSaving ? "Removing…" : "Remove cover photo"}
                                    </button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
