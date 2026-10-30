"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiImage } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileError, setFileError] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Free each preview once it's replaced or the page closes.
    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    function chooseFile(chosen: File | null) {
        setErrorMessage("");
        setFileError(chosen ? logoFileError(chosen) ?? "" : "");
        setFile(chosen);
        // Show the chosen file before it's uploaded.
        setPreviewUrl(chosen ? URL.createObjectURL(chosen) : null);
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!file) {
            setFileError("Choose an image to upload.");
            return;
        }
        if (fileError) return;

        setIsSaving(true);
        setErrorMessage("");

        const supabase = createClient();
        const upload = await uploadLogo(supabase, businessId, file);

        if ("error" in upload) {
            setErrorMessage(upload.error ?? "The logo couldn't be uploaded.");
            setIsSaving(false);
            return;
        }

        const { error } = await supabase
            .from("businesses")
            .update({ logo_url: upload.url })
            .eq("id", businessId);

        if (error) {
            setErrorMessage(error.message);
            setIsSaving(false);
            return;
        }

        // Back to the setup steps, with this one ticked off.
        router.push(`/business/${businessId}`);
        router.refresh();
    }

    const shown = previewUrl ?? logoUrl;

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
                        <form onSubmit={save} noValidate className="space-y-6">
                            <div className="flex size-32 items-center justify-center overflow-hidden rounded-2xl border border-[#17233B]/10 bg-[#FFF8F0]">
                                {shown ? (
                                    // A local blob preview can't go through next/image.
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={shown} alt={`${businessName} logo`} className="size-full object-cover" />
                                ) : (
                                    <FiImage aria-hidden="true" className="size-10 text-[#17233B]/30" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="logo">Logo image</Label>

                                <Input
                                    id="logo"
                                    name="logo"
                                    type="file"
                                    accept={LOGO_ACCEPT}
                                    aria-invalid={fileError ? true : undefined}
                                    aria-describedby={fileError ? "logo-error" : "logo-hint"}
                                    onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                                />

                                <FieldError id="logo-error" message={fileError || undefined} />
                                <p id="logo-hint" className="text-xs text-[#17233B]/65">
                                    A square PNG, JPG or WebP image under 5MB works best.
                                </p>
                            </div>

                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Unable to save your logo</AlertTitle>
                                    <AlertDescription>{errorMessage}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" disabled={isSaving} size="lg" className="w-full">
                                {isSaving ? "Saving logo…" : "Save logo"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
