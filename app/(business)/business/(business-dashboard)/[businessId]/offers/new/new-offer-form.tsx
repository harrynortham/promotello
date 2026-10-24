"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CategorySelect } from "@/components/category-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { OfferScheduleFields, scheduleFromForm } from "@/components/offer-schedule-fields";
import { formatSchedule, scheduleFrom } from "@/lib/schedule";
import { createClient } from "@/utils/supabase/client";
import { announceNewOffer } from "./actions";

type NewOfferFormProps = {
    businessId: string;
    defaultCategoryId: string | null;
    canSchedule: boolean;
};

function createSlug(title: string) {
    const baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

// Scheduled offers describe their days and times unless the business wrote
// its own availability text.
function defaultAvailability(schedule: ReturnType<typeof scheduleFromForm>) {
    const parsed = scheduleFrom(schedule.schedule_days, schedule.schedule_start, schedule.schedule_end);
    return parsed ? formatSchedule(parsed) : "Available now";
}

export default function NewOfferForm({
    businessId,
    defaultCategoryId,
    canSchedule,
}: NewOfferFormProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdOffer, setCreatedOffer] = useState<"live" | "pending" | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);
        const schedule = scheduleFromForm(formData);

        setIsSubmitting(true);
        setErrorMessage("");

        const supabase = createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setIsSubmitting(false);
            setErrorMessage("Please sign in before creating a promotion.");
            return;
        }

        const title = String(formData.get("title") ?? "").trim();

        const maxRedemptionsValue = String(
            formData.get("maxRedemptions") ?? "",
        ).trim();

        const maxRedemptions = maxRedemptionsValue
            ? Number(maxRedemptionsValue)
            : null;

        if (
            maxRedemptions !== null &&
            (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0)
        ) {
            setIsSubmitting(false);
            setErrorMessage(
                "The maximum redemptions must be a whole number greater than zero.",
            );
            return;
        }

        let imageUrl: string | null = null;

        if (imageFile) {
            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
            ];

            if (!allowedTypes.includes(imageFile.type)) {
                setIsSubmitting(false);
                setErrorMessage("Please upload a JPG, PNG, or WebP image.");
                return;
            }

            if (imageFile.size > 5 * 1024 * 1024) {
                setIsSubmitting(false);
                setErrorMessage("The image must be smaller than 5MB.");
                return;
            }

            const fileExtension = imageFile.name.split(".").pop() ?? "jpg";

            const filePath = `${businessId}/offer-${crypto.randomUUID()}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from("offer-images")
                .upload(filePath, imageFile, {
                    upsert: false,
                    contentType: imageFile.type,
                });

            if (uploadError) {
                setIsSubmitting(false);
                setErrorMessage(uploadError.message);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from("offer-images")
                .getPublicUrl(filePath);

            imageUrl = publicUrlData.publicUrl;
        }

        const { data: inserted, error } = await supabase.from("offers").insert({
            business_id: businessId,
            created_by: user.id,
            slug: createSlug(title),
            category_id: formData.get("category"),
            discount: formData.get("discount"),
            title,
            description: formData.get("description"),
            availability:
                formData.get("availability") || defaultAvailability(schedule),
            ...schedule,
            expires_at: formData.get("expiresAt"),
            terms: formData.get("terms"),
            max_redemptions: maxRedemptions,
            redemption_count: 0,
            image_url: imageUrl,
            approval_status: "pending",
        }).select("id").single();

        if (error || !inserted) {
            setIsSubmitting(false);
            setErrorMessage(error?.message ?? "We couldn't create the promotion.");
            return;
        }

        // Pro businesses' offers go live at once; this also emails followers.
        const { live } = await announceNewOffer(inserted.id).catch(() => ({ live: false }));

        setIsSubmitting(false);
        form.reset();
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
                        <form onSubmit={handleSubmit} className="space-y-7">
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

                                <p className="text-xs text-[#17233B]/50">
                                    Optional. Use a JPG, PNG or WebP image under 5MB.
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor="title">
                                    Promotion title{" "}
                                    <span className="text-[#FF593F]">*</span>
                                </Label>

                                <Input
                                    id="title"
                                    name="title"
                                    required
                                    minLength={2}
                                    maxLength={160}
                                    placeholder="20% off your next coffee"
                                />
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="category">
                                        Category{" "}
                                        <span className="text-[#FF593F]">*</span>
                                    </Label>

                                    <CategorySelect
                                        id="category"
                                        name="category"
                                        required
                                        defaultValue={defaultCategoryId}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="discount">
                                        Discount{" "}
                                        <span className="text-[#FF593F]">*</span>
                                    </Label>

                                    <Input
                                        id="discount"
                                        name="discount"
                                        required
                                        maxLength={100}
                                        placeholder="20% off"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    Description{" "}
                                    <span className="text-[#FF593F]">*</span>
                                </Label>

                                <Textarea
                                    id="description"
                                    name="description"
                                    required
                                    minLength={2}
                                    maxLength={5000}
                                    rows={5}
                                    placeholder="Describe what customers will receive."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="availability">Availability</Label>

                                <Input
                                    id="availability"
                                    name="availability"
                                    maxLength={160}
                                    placeholder="Available this weekend"
                                />
                            </div>

                            <OfferScheduleFields
                                businessId={businessId}
                                canSchedule={canSchedule}
                                initial={null}
                            />

                            <div className="space-y-2">
                                <Label htmlFor="expiresAt">
                                    Expiry date{" "}
                                    <span className="text-[#FF593F]">*</span>
                                </Label>

                                <Input
                                    id="expiresAt"
                                    name="expiresAt"
                                    type="date"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxRedemptions">
                                    Maximum redemptions
                                </Label>

                                <Input
                                    id="maxRedemptions"
                                    name="maxRedemptions"
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="Leave empty for unlimited"
                                />

                                <p className="text-xs leading-5 text-[#17233B]/55">
                                    Set a limit to create scarcity or control your campaign
                                    budget. Leave this empty for unlimited redemptions.
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor="terms">
                                    Terms and conditions{" "}
                                    <span className="text-[#FF593F]">*</span>
                                </Label>

                                <Textarea
                                    id="terms"
                                    name="terms"
                                    required
                                    minLength={2}
                                    maxLength={5000}
                                    rows={5}
                                    placeholder="Valid once per customer. Cannot be combined with other offers."
                                />
                            </div>

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