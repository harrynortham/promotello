"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/field-error";
import {
    OfferFields,
    imageProblem,
    offerRow,
    offerSchema,
    uploadOfferImage,
    type OfferInput,
    type OfferValues,
} from "@/components/offer-fields";
import { scheduleFromForm } from "@/components/offer-schedule-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client";
import { announceNewOffer } from "./actions";

type NewOfferFormProps = {
    businessId: string;
    defaultCategoryId: string | null;
    canSchedule: boolean;
};

const schema = offerSchema();

export default function NewOfferForm({
    businessId,
    defaultCategoryId,
    canSchedule,
}: NewOfferFormProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [createdOffer, setCreatedOffer] = useState<"live" | "pending" | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<OfferInput, unknown, OfferValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            category: defaultCategoryId ?? "",
            discount: "",
            description: "",
            availability: "",
            expiresAt: "",
            maxRedemptions: "",
            terms: "",
        },
    });

    async function onSubmit(values: OfferValues, event?: React.BaseSyntheticEvent) {
        setErrorMessage("");

        const problem = imageProblem(imageFile);
        if (problem) {
            setError("root.image", { message: problem });
            return;
        }

        const schedule = scheduleFromForm(new FormData(event?.target as HTMLFormElement));
        const supabase = createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setErrorMessage("Please sign in before creating a promotion.");
            return;
        }

        let imageUrl: string | null = null;

        if (imageFile) {
            const upload = await uploadOfferImage(supabase, businessId, imageFile);

            if ("error" in upload) {
                setErrorMessage(upload.error ?? "The image couldn't be uploaded.");
                return;
            }

            imageUrl = upload.url;
        }

        // The database sets the slug from the business name and title.
        const { data: inserted, error } = await supabase.from("offers").insert({
            ...offerRow(values, schedule),
            business_id: businessId,
            created_by: user.id,
            slug: crypto.randomUUID(),
            redemption_count: 0,
            image_url: imageUrl,
            approval_status: "pending",
        }).select("id").single();

        if (error || !inserted) {
            setErrorMessage(error?.message ?? "We couldn't create the promotion.");
            return;
        }

        // Pro businesses' offers go live at once; this also emails followers.
        const { live } = await announceNewOffer(inserted.id).catch(() => ({ live: false }));

        reset();
        setImageFile(null);
        setCreatedOffer(live ? "live" : "pending");
    }

    if (createdOffer) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
                <Card className="w-full max-w-lg border-[#17233B]/10 text-center">
                    <CardContent className="p-8 sm:p-10">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF593F]/15 text-2xl text-[#FF593F]">
                            ✓
                        </div>

                        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            {createdOffer === "live" ? "Promotion live" : "Promotion submitted"}
                        </p>

                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                            {createdOffer === "live"
                                ? "Your promotion is live"
                                : "Your promotion is pending approval"}
                        </h1>

                        <p className="mt-4 leading-7 text-[#17233B]/65">
                            {createdOffer === "live"
                                ? "Customers can see and claim it now, and your followers are getting an email about it. Share it from your promotions list to reach even more people."
                                : "Once approved, it will become visible to customers. Pro businesses' promotions go live straight away."}
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                render={<Link href="/business/dashboard" />}
                                nativeButton={false}
                                variant="outline"
                            >
                                Back to dashboard
                            </Button>

                            <Button
                                type="button"
                                variant="default"
                                onClick={() => setCreatedOffer(null)}
                            >
                                Create another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Button
                    render={<Link href="/business/dashboard" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to dashboard
                </Button>

                <div className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        New promotion
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Create a promotion
                    </h1>

                    <p className="mt-4 leading-7 text-[#17233B]/65">
                        Once your business is approved and on Pro, promotions go live
                        as soon as you create them. Otherwise our team reviews them
                        first.
                    </p>
                </div>

                <Card className="mt-10 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Promotion details</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
                            <div className="space-y-2">
                                <Label htmlFor="image">Promotion image</Label>

                                <Input
                                    id="image"
                                    name="image"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) =>
                                        setImageFile(event.target.files?.[0] ?? null)
                                    }
                                />

                                <FieldError id="image-error" message={errors.root?.image?.message} />
                                <p className="text-xs text-[#17233B]/50">
                                    Optional. Use a JPG, PNG or WebP image under 5MB.
                                </p>
                            </div>

                            <Separator />

                            <OfferFields
                                register={register}
                                errors={errors}
                                businessId={businessId}
                                canSchedule={canSchedule}
                                schedule={null}
                                defaultCategoryId={defaultCategoryId}
                            />

                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Unable to create promotion</AlertTitle>

                                    <AlertDescription>
                                        {errorMessage}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                variant="default"
                                size="lg"
                                className="w-full"
                            >
                                {isSubmitting
                                    ? "Submitting promotion…"
                                    : "Submit promotion"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}