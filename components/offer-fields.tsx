"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { CategorySelect } from "@/components/category-select";
import { FieldError, invalidProps } from "@/components/field-error";
import { OfferScheduleFields, type scheduleFromForm } from "@/components/offer-schedule-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatSchedule, scheduleFrom, type OfferSchedule } from "@/lib/schedule";
import { optionalText, requiredText } from "@/lib/validation";

// The fields, rules and image upload shared by the new and edit promotion
// forms. The quiet-hours schedule is its own widget (OfferScheduleFields)
// and is read from the submitted form with scheduleFromForm().

function todayInUk() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

export function offerSchema({ minRedemptions = 1, allowPastExpiry = false } = {}) {
    return z.object({
        title: requiredText("The title", { min: 2, max: 160 }),
        category: z.string().min(1, "Choose a category."),
        discount: requiredText("The discount", { max: 100 }),
        description: requiredText("The description", { min: 2, max: 5000 }),
        availability: optionalText("Availability", 160),
        expiresAt: z
            .string()
            .min(1, "Choose when the promotion ends.")
            .refine((value) => allowPastExpiry || value >= todayInUk(), "Choose today or a later date."),
        maxRedemptions: z
            .string()
            .trim()
            .refine((value) => !value || /^\d+$/.test(value), "Use a whole number, or leave it empty for unlimited.")
            .transform((value) => (value ? Number(value) : null))
            .refine((value) => value === null || value >= Math.max(minRedemptions, 1), {
                message:
                    minRedemptions > 1
                        ? `The limit can't be lower than the ${minRedemptions} already claimed.`
                        : "Use a number greater than zero.",
            }),
        terms: requiredText("The terms", { min: 2, max: 5000 }),
    });
}

export type OfferInput = z.input<ReturnType<typeof offerSchema>>;
export type OfferValues = z.output<ReturnType<typeof offerSchema>>;

// The offers row for the values and schedule. Scheduled offers describe
// their days and times unless the business wrote its own availability.
export function offerRow(values: OfferValues, schedule: ReturnType<typeof scheduleFromForm>) {
    const parsed = scheduleFrom(schedule.schedule_days, schedule.schedule_start, schedule.schedule_end);

    return {
        title: values.title,
        category_id: values.category,
        discount: values.discount,
        description: values.description,
        availability: values.availability || (parsed ? formatSchedule(parsed) : "Available now"),
        expires_at: values.expiresAt,
        terms: values.terms,
        max_redemptions: values.maxRedemptions,
        ...schedule,
    };
}

const imageTypes = ["image/jpeg", "image/png", "image/webp"];

// Why an image can't be used, or null if it's fine.
export function imageProblem(file: File | null) {
    if (!file) return null;
    if (!imageTypes.includes(file.type)) return "Please upload a JPG, PNG, or WebP image.";
    if (file.size > 5 * 1024 * 1024) return "The image must be smaller than 5MB.";
    return null;
}

export async function uploadOfferImage(supabase: SupabaseClient, businessId: string, file: File) {
    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${businessId}/offer-${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
        .from("offer-images")
        .upload(path, file, { upsert: false, contentType: file.type });

    if (error) return { error: error.message };

    return { url: supabase.storage.from("offer-images").getPublicUrl(path).data.publicUrl };
}

function Required() {
    return <span className="text-[#FF593F]">*</span>;
}

export function OfferFields({
    register,
    errors,
    businessId,
    canSchedule,
    schedule,
    defaultCategoryId,
    minRedemptions = 0,
}: {
    register: UseFormRegister<OfferInput>;
    errors: FieldErrors<OfferInput>;
    businessId: string;
    canSchedule: boolean;
    schedule: OfferSchedule | null;
    defaultCategoryId?: string | null;
    // Already claimed, when editing.
    minRedemptions?: number;
}) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="title">
                    Promotion title <Required />
                </Label>
                <Input
                    id="title"
                    maxLength={160}
                    placeholder="20% off your next coffee"
                    {...register("title")}
                    {...invalidProps("title-error", errors.title)}
                />
                <FieldError id="title-error" message={errors.title?.message} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="category">
                        Category <Required />
                    </Label>
                    <CategorySelect
                        id="category"
                        name="category"
                        defaultValue={defaultCategoryId}
                        registration={register("category")}
                        invalid={invalidProps("category-error", errors.category)}
                    />
                    <FieldError id="category-error" message={errors.category?.message} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="discount">
                        Discount <Required />
                    </Label>
                    <Input
                        id="discount"
                        maxLength={100}
                        placeholder="20% off"
                        {...register("discount")}
                        {...invalidProps("discount-error", errors.discount)}
                    />
                    <FieldError id="discount-error" message={errors.discount?.message} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">
                    Description <Required />
                </Label>
                <Textarea
                    id="description"
                    maxLength={5000}
                    rows={5}
                    placeholder="Describe what customers will receive."
                    {...register("description")}
                    {...invalidProps("description-error", errors.description)}
                />
                <FieldError id="description-error" message={errors.description?.message} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Input id="availability" maxLength={160} placeholder="Available this weekend" {...register("availability")} />
            </div>

            <OfferScheduleFields businessId={businessId} canSchedule={canSchedule} initial={schedule} />

            <div className="space-y-2">
                <Label htmlFor="expiresAt">
                    Expiry date <Required />
                </Label>
                <Input
                    id="expiresAt"
                    type="date"
                    {...register("expiresAt")}
                    {...invalidProps("expiresAt-error", errors.expiresAt)}
                />
                <FieldError id="expiresAt-error" message={errors.expiresAt?.message} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="maxRedemptions">Maximum redemptions</Label>
                <Input
                    id="maxRedemptions"
                    type="number"
                    min={Math.max(minRedemptions, 1)}
                    step="1"
                    placeholder="Leave empty for unlimited"
                    {...register("maxRedemptions")}
                    {...invalidProps("maxRedemptions-error", errors.maxRedemptions)}
                />
                <FieldError id="maxRedemptions-error" message={errors.maxRedemptions?.message} />
                <p className="text-xs leading-5 text-[#17233B]/70">
                    {minRedemptions > 0
                        ? "The limit cannot be lower than the number already claimed. Leave empty for unlimited redemptions."
                        : "Set a limit to create scarcity or control your campaign budget. Leave this empty for unlimited redemptions."}
                </p>
            </div>

            <Separator />

            <div className="space-y-2">
                <Label htmlFor="terms">
                    Terms and conditions <Required />
                </Label>
                <Textarea
                    id="terms"
                    maxLength={5000}
                    rows={5}
                    placeholder="Valid once per customer. Cannot be combined with other offers."
                    {...register("terms")}
                    {...invalidProps("terms-error", errors.terms)}
                />
                <FieldError id="terms-error" message={errors.terms?.message} />
            </div>
        </>
    );
}
