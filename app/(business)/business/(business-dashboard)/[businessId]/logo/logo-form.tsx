"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Area } from "react-easy-crop";
import { FiImage, FiUpload } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/field-error";
import { ImageCropper, cropImage } from "@/components/image-cropper";
import { LOGO_ACCEPT, logoFileError, uploadLogo } from "@/lib/business-logo";
import { createClient } from "@/utils/supabase/client";

export default function LogoForm({
    businessId,
    businessName,
    logoUrl,
}: {
    businessId: string;
    businessName: string;
    logoUrl: string | null;
}) {
    const router = useRouter();
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
        const problem = logoFileError(chosen);
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

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!file || !previewUrl || !cropArea) return;

        setIsSaving(true);
        setErrorMessage("");

        try {
            // JPEGs stay JPEG; PNG and WebP keep any transparency.
            const type = file.type === "image/jpeg" ? "image/jpeg" : file.type;
            const blob = await cropImage(previewUrl, cropArea, { type, maxSize: 1024 });
            const cropped = new File([blob], file.name, { type });

            const supabase = createClient();
            const upload = await uploadLogo(supabase, businessId, cropped);

            if ("error" in upload) {
                throw new Error(upload.error ?? "The logo couldn't be uploaded.");
            }

            const { error } = await supabase
                .from("businesses")
                .update({ logo_url: upload.url })
                .eq("id", businessId);

            if (error) throw new Error(error.message);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "The logo couldn't be saved.");
            setIsSaving(false);
            return;
        }

        // Back to the setup steps, with this one ticked off.
        router.push(`/business/${businessId}`);
        router.refresh();
    }

    return (
        <div className="text-[#17233B]">
            <div className="mx-auto max-w-xl">
                <Button
                    render={<Link href={`/business/${businessId}`} />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to dashboard
                </Button>

                <div className="mt-8">
                    <h1 className="text-4xl font-semibold tracking-tight">
                        {logoUrl ? "Change your logo" : "Add your logo"}
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        It shows on your page, your offers and your loyalty card, so customers
                        recognise {businessName}.
                    </p>
                </div>

                <Card className="mt-10 border-[#17233B]/10">
                    <CardContent className="p-6 sm:p-10">
                        <input
                            ref={inputRef}
                            id="logo"
                            type="file"
                            accept={LOGO_ACCEPT}
                            className="sr-only"
                            tabIndex={-1}
                            aria-hidden="true"
                            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                        />

                        {file && previewUrl ? (
                            <form onSubmit={save} noValidate className="space-y-6">
                                <ImageCropper src={previewUrl} onCropChange={setCropArea} />

                                {errorMessage && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Unable to save your logo</AlertTitle>
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
                                        {isSaving ? "Saving logo…" : "Save logo"}
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
                                <div className="flex size-32 items-center justify-center overflow-hidden rounded-2xl border border-[#17233B]/10 bg-[#FFF8F0]">
                                    {logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={logoUrl} alt={`${businessName} logo`} className="size-full object-cover" />
                                    ) : (
                                        <FiImage aria-hidden="true" className="size-10 text-[#17233B]/30" />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={() => inputRef.current?.click()}
                                        aria-describedby={fileError ? "logo-error logo-hint" : "logo-hint"}
                                    >
                                        <FiUpload aria-hidden="true" />
                                        Upload from device
                                    </Button>

                                    <FieldError id="logo-error" message={fileError || undefined} />
                                    <p id="logo-hint" className="text-xs text-[#17233B]/65">
                                        PNG, JPG or WebP under 5MB. You can zoom and reposition it next.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
