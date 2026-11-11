"use client";

import type { Control, FieldErrors, UseFormRegister, UseFormRegisterReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { CategorySelect, nativeSelectClassName } from "@/components/category-select";
import { FieldError, invalidProps } from "@/components/field-error";
import { OfferScheduleFields, type scheduleFromForm } from "@/components/offer-schedule-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    HEADLINE_MAX,
    ITEM_MAX,
    OFFER_KINDS,
    isOfferKind,
    kindTakes,
    offerHeadline,
    offerKind,
    type OfferKind,
} from "@/lib/offer-kinds";
import { formatSchedule, scheduleFrom, type OfferSchedule } from "@/lib/schedule";
import { optionalText, requiredText } from "@/lib/validation";

// The fields, rules and image upload shared by the new and edit offer
// forms. The quiet-hours schedule is its own widget (OfferScheduleFields)
// and is read from the submitted form with scheduleFromForm().
//
// "The offer" used to be one free-text box. It is now a type and only the
// numbers that type needs; the headline customers read is built from them
// by lib/offer-kinds.ts, which is the only thing that assembles one.

function todayInUk() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

export function offerSchema({ minRedemptions = 1, allowPastExpiry = false } = {}) {
    return z.object({
        title: requiredText("The title", { min: 2, max: 160 }),
        category: z.string().min(1, "Choose a category."),
        kind: z.string().min(1, "Choose a type of offer."),
        // Text, because these are inputs; offerRow() turns them into
        // numbers and nulls. Each is checked by checkKind() below, but
        // only when the chosen type actually asks for it.
        kindValue: z.string().trim(),
        kindQuantity: z.string().trim(),
        kindItem: z.string().trim(),
        // Only "Something else" writes the headline by hand.
        discount: z.string().trim(),
        description: requiredText("The description", { min: 2, max: 5000 }),
        availability: optionalText("Availability", 160),
        expiresAt: z
            .string()
            .min(1, "Choose when the offer ends.")
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
    }).superRefine(checkKind);
}

export type OfferInput = z.input<ReturnType<typeof offerSchema>>;
export type OfferValues = z.output<ReturnType<typeof offerSchema>>;

// What the chosen type needs, and nothing else: a percentage is not asked
// for on a freebie. Messages land under their own field and say what to
// do, the way lib/validation.ts writes them.
function checkKind(
    values: { kind: string; kindValue: string; kindQuantity: string; kindItem: string; discount: string },
    ctx: z.RefinementCtx,
) {
    const kind = values.kind;

    // Nothing picked yet: "Choose a type of offer." has already been said.
    if (!isOfferKind(kind)) return;

    function problem(path: string, message: string) {
        ctx.addIssue({ code: "custom", path: [path], message });
    }

    if (kindTakes(kind, "value")) {
        const amount = Number(values.kindValue);
        const given = values.kindValue !== "" && Number.isFinite(amount);

        if (kind === "percent_off") {
            if (!given || !Number.isInteger(amount) || amount < 1 || amount > 100) {
                problem("kindValue", "Enter a percentage between 1 and 100.");
            }
        } else if (!given || amount <= 0) {
            problem("kindValue", "Enter an amount, like 5 or 2.50.");
        }
    }

    if (kindTakes(kind, "quantity")) {
        const quantity = Number(values.kindQuantity);

        if (
            values.kindQuantity === "" ||
            !Number.isInteger(quantity) ||
            quantity < 2 ||
            quantity > 10
        ) {
            problem("kindQuantity", "Enter how many they get, between 2 and 10.");
        }
    }

    if (kindTakes(kind, "item")) {
        if (offerKind(kind).itemRequired && !values.kindItem) {
            problem(
                "kindItem",
                kind === "freebie"
                    ? "Enter what's free, like pastry or side."
                    : "Enter what the price is for, like beard trim.",
            );
        }

        if (values.kindItem.length > ITEM_MAX) {
            problem("kindItem", `That can be up to ${ITEM_MAX} characters.`);
        }
    }

    if (kind === "other") {
        if (!values.discount) {
            problem("discount", "Enter the offer as it should appear, like 3rd half price.");
        }

        if (values.discount.length > HEADLINE_MAX) {
            problem("discount", `The offer can be up to ${HEADLINE_MAX} characters.`);
        }
    }
}

type KindFields = {
    kind?: string | null;
    kindValue?: string | null;
    kindQuantity?: string | null;
    kindItem?: string | null;
    discount?: string | null;
};

// The type's inputs as the columns hold them: a number, or null where the
// type doesn't use it, so switching type never leaves a stale number
// behind.
function kindParts(values: KindFields) {
    const kind: OfferKind = isOfferKind(values.kind) ? values.kind : "other";
    const amount = (values.kindValue ?? "").trim();
    const count = (values.kindQuantity ?? "").trim();
    const item = (values.kindItem ?? "").trim();

    return {
        kind,
        value: kindTakes(kind, "value") && amount !== "" ? Number(amount) : null,
        quantity: kindTakes(kind, "quantity") && count !== "" ? Number(count) : null,
        item: (kindTakes(kind, "item") && item.slice(0, ITEM_MAX)) || null,
        text: values.discount ?? "",
    };
}

// The headline as it will read, for the line under the inputs and the
// preview card. Empty until there is something true to say.
export function draftHeadline(values: KindFields) {
    return offerHeadline(kindParts(values));
}

// The offers row for the values and schedule. Scheduled offers describe
// their days and times unless the business wrote its own availability.
export function offerRow(values: OfferValues, schedule: ReturnType<typeof scheduleFromForm>) {
    const parsed = scheduleFrom(schedule.schedule_days, schedule.schedule_start, schedule.schedule_end);
    const parts = kindParts(values);

    return {
        title: values.title,
        category_id: values.category,
        // Built, never typed, so "20% offer" can't happen.
        discount: offerHeadline(parts),
        kind: parts.kind,
        kind_value: parts.value,
        kind_quantity: parts.quantity,
        kind_item: parts.item,
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

// What each type calls its inputs. The label says what to type, so the
// example underneath doesn't have to do both jobs.
const kindInputWords: Record<
    OfferKind,
    {
        value?: { label: string; placeholder: string; unit: "%" | "£"; step: string };
        quantity?: { label: string; placeholder: string };
        item?: { label: string; placeholder: string };
    }
> = {
    percent_off: {
        value: { label: "Percentage off", placeholder: "20", unit: "%", step: "1" },
        item: { label: "What it's on (optional)", placeholder: "pints" },
    },
    money_off: {
        value: { label: "Amount off", placeholder: "5", unit: "£", step: "0.01" },
        item: { label: "What it's on (optional)", placeholder: "a cut and finish" },
    },
    two_for_one: {
        item: { label: "What it's on (optional)", placeholder: "cocktails" },
    },
    multi_buy: {
        quantity: { label: "How many", placeholder: "2" },
        value: { label: "For a total of", placeholder: "15", unit: "£", step: "0.01" },
    },
    fixed_price: {
        value: { label: "Price", placeholder: "8", unit: "£", step: "0.01" },
        item: { label: "What it's for", placeholder: "beard trim" },
    },
    freebie: {
        item: { label: "What's free", placeholder: "pastry" },
    },
    other: {},
};

// A number with its unit beside it, so "20" reads as 20% and not £20.
function AmountInput({
    id,
    unit,
    step,
    placeholder,
    registration,
    invalid,
}: {
    id: string;
    unit: "%" | "£";
    step: string;
    placeholder: string;
    registration: UseFormRegisterReturn;
    invalid: { "aria-invalid"?: true; "aria-describedby"?: string };
}) {
    return (
        <div className="relative">
            {unit === "£" && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#17233B]/60 md:text-sm"
                >
                    £
                </span>
            )}

            <Input
                id={id}
                type="number"
                inputMode="decimal"
                min={unit === "%" ? 1 : 0}
                step={step}
                placeholder={placeholder}
                className={unit === "£" ? "pl-7" : "pr-8"}
                {...registration}
                {...invalid}
            />

            {unit === "%" && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-[#17233B]/60 md:text-sm"
                >
                    %
                </span>
            )}
        </div>
    );
}

// The type, then only the inputs that type needs, then the headline they
// add up to.
function OfferKindFields({
    register,
    errors,
    control,
}: {
    register: UseFormRegister<OfferInput>;
    errors: FieldErrors<OfferInput>;
    control: Control<OfferInput, unknown, OfferValues>;
}) {
    const draft = useWatch({ control, name: ["kind", "kindValue", "kindQuantity", "kindItem", "discount"] });
    const [kind, kindValue, kindQuantity, kindItem, discount] = draft;
    const chosen = isOfferKind(kind) ? kind : null;
    const spec = chosen ? offerKind(chosen) : null;
    const words = chosen ? kindInputWords[chosen] : null;
    const headline = chosen
        ? draftHeadline({ kind, kindValue, kindQuantity, kindItem, discount })
        : "";

    return (
        <div className="space-y-2">
            <Label htmlFor="kind">
                Type of offer <Required />
            </Label>

            <select
                id="kind"
                className={nativeSelectClassName}
                {...register("kind")}
                {...invalidProps("kind-error", errors.kind)}
            >
                <option value="" disabled>
                    Choose a type
                </option>

                {OFFER_KINDS.map((option) => (
                    <option key={option.kind} value={option.kind}>
                        {option.label}
                    </option>
                ))}
            </select>

            <FieldError id="kind-error" message={errors.kind?.message} />

            {chosen && spec && words && (
                <div className="space-y-3 pt-1">
                    {(words.quantity || words.value) && (
                        <div className={words.quantity && words.value ? "grid grid-cols-2 gap-3" : undefined}>
                            {words.quantity && (
                                <div className="space-y-2">
                                    <Label htmlFor="kindQuantity">{words.quantity.label}</Label>

                                    <Input
                                        id="kindQuantity"
                                        type="number"
                                        inputMode="numeric"
                                        min={2}
                                        max={10}
                                        step="1"
                                        placeholder={words.quantity.placeholder}
                                        {...register("kindQuantity")}
                                        {...invalidProps("kindQuantity-error", errors.kindQuantity)}
                                    />

                                    <FieldError
                                        id="kindQuantity-error"
                                        message={errors.kindQuantity?.message}
                                    />
                                </div>
                            )}

                            {words.value && (
                                <div className="space-y-2">
                                    <Label htmlFor="kindValue">{words.value.label}</Label>

                                    <AmountInput
                                        id="kindValue"
                                        unit={words.value.unit}
                                        step={words.value.step}
                                        placeholder={words.value.placeholder}
                                        registration={register("kindValue")}
                                        invalid={invalidProps("kindValue-error", errors.kindValue)}
                                    />

                                    <FieldError id="kindValue-error" message={errors.kindValue?.message} />
                                </div>
                            )}
                        </div>
                    )}

                    {words.item && (
                        <div className="space-y-2">
                            <Label htmlFor="kindItem">
                                {words.item.label} {spec.itemRequired && <Required />}
                            </Label>

                            <Input
                                id="kindItem"
                                maxLength={ITEM_MAX}
                                placeholder={words.item.placeholder}
                                {...register("kindItem")}
                                {...invalidProps("kindItem-error", errors.kindItem)}
                            />

                            <FieldError id="kindItem-error" message={errors.kindItem?.message} />
                        </div>
                    )}

                    {chosen === "other" && (
                        <div className="space-y-2">
                            <Label htmlFor="discount">
                                The offer <Required />
                            </Label>

                            <Input
                                id="discount"
                                maxLength={HEADLINE_MAX}
                                placeholder="3rd half price"
                                {...register("discount")}
                                {...invalidProps("discount-error", errors.discount)}
                            />

                            <FieldError id="discount-error" message={errors.discount?.message} />

                            <p className="text-xs leading-5 text-muted-foreground">
                                Use this only if none of the others fit. It won&apos;t
                                appear in the type filter.
                            </p>
                        </div>
                    )}

                    {chosen !== "other" && (
                        <p className="text-xs leading-5 text-muted-foreground">
                            For example: {spec.example}.
                        </p>
                    )}

                    {headline && (
                        <p className="text-xs leading-5 text-[#17233B]/70">
                            On your card:{" "}
                            <strong className="font-semibold text-[#17233B]">{headline}</strong>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export function OfferFields({
    register,
    errors,
    control,
    businessId,
    canSchedule,
    schedule,
    defaultCategoryId,
    minRedemptions = 0,
}: {
    register: UseFormRegister<OfferInput>;
    errors: FieldErrors<OfferInput>;
    control: Control<OfferInput, unknown, OfferValues>;
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
                    Offer title <Required />
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

                <OfferKindFields register={register} errors={errors} control={control} />
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
