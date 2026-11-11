"use client";

import Link from "next/link";
import { FiLock } from "react-icons/fi";
import type {
    Control,
    FieldErrors,
    UseFormRegister,
    UseFormGetValues,
    UseFormRegisterReturn,
    UseFormSetValue,
} from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { CategorySelect, nativeSelectClassName } from "@/components/category-select";
import { FieldError, invalidProps } from "@/components/field-error";
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
import { availabilityLine, availabilityParts, enforcedSchedule, weekdayOrder } from "@/lib/schedule";
import { requiredText } from "@/lib/validation";

// The fields, rules and image upload shared by the new and edit offer
// forms.
//
// Two things on this form are built rather than typed, for the same
// reason — a business shouldn't have to word them, and we shouldn't have
// to read what they wrote:
//
// - "The offer" is a type and the numbers that type needs; the headline
//   comes from lib/offer-kinds.ts.
// - "When can it be used?" and "Who is it for?" are pickers; the line
//   comes from availabilityLine() in lib/schedule.ts.
//
// The days and times are also what the till enforces, for a business on
// Growth that asks for it — one answer, not the two the form used to
// ask for.

function todayInUk() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

// The type and its inputs, as text because that is what an input holds;
// kindRow() turns them into numbers and nulls. Each is checked by
// checkKind() below, but only when the chosen type asks for it. Shared
// so the admin's correction form has the same rules as the business's.
export const kindFields = {
    kind: z.string().min(1, "Choose a type of offer."),
    kindValue: z.string().trim(),
    kindQuantity: z.string().trim(),
    kindItem: z.string().trim(),
    // Only "Something else" writes the headline by hand.
    discount: z.string().trim(),
};

export function offerKindSchema() {
    return z.object(kindFields).superRefine(checkKind);
}

export type KindInput = z.input<ReturnType<typeof offerKindSchema>>;

// When it can be used and who it is for. "when" is the radio; the days
// and times under it only mean anything for the two it names, and
// offerRow() clears them when it doesn't.
export const availabilityFields = {
    when: z.enum(["any", "days", "times"]),
    availableDays: z.array(z.number()),
    availableFrom: z.string(),
    availableUntil: z.string(),
    audience: z.enum(["everyone", "new_customers"]),
    // Growth only: the window the till enforces as well as prints.
    enforceSchedule: z.boolean(),
};

export function offerAvailabilitySchema() {
    return z.object(availabilityFields).superRefine(checkAvailability);
}

export type AvailabilityInput = z.input<ReturnType<typeof offerAvailabilitySchema>>;

// What an admin can put right on a live offer without the business: the
// type, and when it can be used. Same fields, same rules.
export function offerCorrectionSchema() {
    return z
        .object({ ...kindFields, ...availabilityFields })
        .superRefine(checkKind)
        .superRefine(checkAvailability);
}

export type CorrectionInput = z.input<ReturnType<typeof offerCorrectionSchema>>;

function checkAvailability(
    values: { when: string; availableDays: number[]; availableFrom: string; availableUntil: string },
    ctx: z.RefinementCtx,
) {
    if (values.when === "any") return;

    if (values.availableDays.length === 0) {
        ctx.addIssue({ code: "custom", path: ["availableDays"], message: "Pick at least one day." });
    }

    if (values.when !== "times") return;

    if (!values.availableFrom && !values.availableUntil) {
        ctx.addIssue({ code: "custom", path: ["availableFrom"], message: "Add a start or an end time." });
        return;
    }

    if (values.availableFrom && values.availableUntil && values.availableFrom >= values.availableUntil) {
        ctx.addIssue({
            code: "custom",
            path: ["availableUntil"],
            message: "Choose an end time after the start time.",
        });
    }
}

export function offerSchema({ minRedemptions = 1, allowPastExpiry = false } = {}) {
    return z.object({
        title: requiredText("The title", { min: 2, max: 160 }),
        category: z.string().min(1, "Choose a category."),
        ...kindFields,
        ...availabilityFields,
        description: requiredText("The description", { min: 2, max: 5000 }),
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
    }).superRefine(checkKind).superRefine(checkAvailability);
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

// The four columns and the headline built from them.
export function kindRow(values: KindFields) {
    const parts = kindParts(values);

    return {
        // Built, never typed, so "20% offer" can't happen.
        discount: offerHeadline(parts),
        kind: parts.kind,
        kind_value: parts.value,
        kind_quantity: parts.quantity,
        kind_item: parts.item,
    };
}

// The offers row for the values and schedule. Scheduled offers describe
// their days and times unless the business wrote its own availability.
export function offerRow(values: OfferValues) {
    const parts = availabilityParts(values);

    return {
        title: values.title,
        category_id: values.category,
        ...kindRow(values),
        description: values.description,
        // Built, never typed, so every card says it the same way.
        availability: availabilityLine(parts),
        available_days: parts.days,
        available_from: parts.from,
        available_until: parts.until,
        audience: parts.audience,
        // The same answer again, in the columns the till reads — only
        // when the business asked for it to be enforced.
        ...enforcedSchedule(parts, values.enforceSchedule),
        expires_at: values.expiresAt,
        terms: values.terms,
        max_redemptions: values.maxRedemptions,
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
// add up to. Typed on the kind fields alone, so the offer forms and the
// admin's correction form share it.
export function OfferKindFields({
    register,
    errors,
    control,
}: {
    register: UseFormRegister<KindInput>;
    errors: FieldErrors<KindInput>;
    control: Control<KindInput, unknown, unknown>;
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

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const whenOptions = [
    { value: "any", label: "Any time you're open" },
    { value: "days", label: "Certain days" },
    { value: "times", label: "Certain days and times" },
] as const;

const audienceOptions = [
    { value: "everyone", label: "Everyone" },
    { value: "new_customers", label: "New customers only" },
] as const;

// A radio that reads as a row you can press anywhere on, rather than a
// dot with some words beside it.
function Choice({
    id,
    value,
    label,
    registration,
}: {
    id: string;
    value: string;
    label: string;
    registration: UseFormRegisterReturn;
}) {
    return (
        <label
            htmlFor={id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#17233B]/10 px-3 py-2.5 text-sm transition has-checked:border-[#FF593F] has-checked:bg-[#FF593F]/5"
        >
            <input
                id={id}
                type="radio"
                value={value}
                className="size-4 shrink-0 accent-[#FF593F]"
                {...registration}
            />
            {label}
        </label>
    );
}

// When it can be used, who it is for, and whether the till holds anyone
// to it. The line underneath is what the card will say.
//
// The days and times are not a Growth feature: every business can say
// when its offer runs. What Growth buys is the tick-box — having staff
// held to it at the till.
export function OfferAvailabilityFields({
    register,
    errors,
    control,
    setValue,
    getValues,
    businessId,
    canSchedule,
    currentLine,
    hideEnforcement = false,
}: {
    register: UseFormRegister<AvailabilityInput>;
    errors: FieldErrors<AvailabilityInput>;
    control: Control<AvailabilityInput, unknown, unknown>;
    setValue: UseFormSetValue<AvailabilityInput>;
    getValues: UseFormGetValues<AvailabilityInput>;
    businessId: string;
    canSchedule: boolean;
    // An offer whose line was written before these pickers existed. The
    // note says what customers see now, because saving replaces it.
    currentLine?: string | null;
    // For a form that writes what the card says and nothing else — the
    // admin's. Whether staff are held to the window is the business's to
    // ask for, on its own plan.
    hideEnforcement?: boolean;
}) {
    // The enforce box isn't watched: it changes nothing on screen, and
    // the line it would affect is the same either way.
    const draft = useWatch({
        control,
        name: ["when", "availableDays", "availableFrom", "availableUntil", "audience"],
    });
    const [when, availableDays, availableFrom, availableUntil, audience] = draft;
    const days = availableDays ?? [];
    const chosen = when === "days" || when === "times";
    const line = availabilityLine(
        availabilityParts({ when, availableDays: days, availableFrom, availableUntil, audience }),
    );

    // Read from the form rather than from what was last rendered: two
    // chips pressed in the same frame would otherwise both start from
    // the same days, and the first press would be lost.
    function toggleDay(day: number) {
        const current = getValues("availableDays") ?? [];
        const next = current.includes(day) ? current.filter((value) => value !== day) : [...current, day];

        setValue("availableDays", next.sort((a, b) => a - b), { shouldValidate: true, shouldDirty: true });
    }

    return (
        <div className="space-y-5">
            {currentLine && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6">
                    Customers currently see: &ldquo;{currentLine}&rdquo;. Choose the days
                    and times below and saving will replace it.
                </div>
            )}

            <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">
                    When can it be used? <Required />
                </legend>

                <div className="grid gap-2 sm:grid-cols-3">
                    {whenOptions.map((option) => (
                        <Choice
                            key={option.value}
                            id={`when-${option.value}`}
                            value={option.value}
                            label={option.label}
                            registration={register("when")}
                        />
                    ))}
                </div>

                {chosen && (
                    <div className="space-y-4 pt-2">
                        <div>
                            <p className="text-sm font-medium">Days</p>

                            <div className="mt-2 flex flex-wrap gap-2">
                                {weekdayOrder.map((day) => {
                                    const on = days.includes(day);

                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => toggleDay(day)}
                                            className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition ${on ? "border-[#FF593F] bg-[#FF593F] text-white" : "border-[#17233B]/15 bg-white hover:border-[#17233B]/40"}`}
                                        >
                                            {dayLabels[day]}
                                        </button>
                                    );
                                })}
                            </div>

                            <FieldError id="availableDays-error" message={errors.availableDays?.message} />
                        </div>

                        {when === "times" && (
                            <div className="grid max-w-sm grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="availableFrom">From</Label>

                                    <Input
                                        id="availableFrom"
                                        type="time"
                                        {...register("availableFrom")}
                                        {...invalidProps("availableFrom-error", errors.availableFrom)}
                                    />

                                    <FieldError
                                        id="availableFrom-error"
                                        message={errors.availableFrom?.message}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="availableUntil">Until</Label>

                                    <Input
                                        id="availableUntil"
                                        type="time"
                                        {...register("availableUntil")}
                                        {...invalidProps("availableUntil-error", errors.availableUntil)}
                                    />

                                    <FieldError
                                        id="availableUntil-error"
                                        message={errors.availableUntil?.message}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Leaving one end empty is an answer: "until 10am"
                            runs from opening, "from 5pm" until closing. */}
                        {when === "times" && (
                            <p className="text-xs leading-5 text-muted-foreground">
                                Leave one empty for an open end: until 10am, or from 5pm.
                            </p>
                        )}

                        {hideEnforcement ? null : canSchedule ? (
                            <label
                                htmlFor="enforceSchedule"
                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#17233B]/10 p-4 text-sm"
                            >
                                <input
                                    id="enforceSchedule"
                                    type="checkbox"
                                    className="mt-0.5 size-4 shrink-0 accent-[#FF593F]"
                                    {...register("enforceSchedule")}
                                />

                                <span>
                                    <span className="font-medium">
                                        Only let staff redeem it at these times
                                    </span>

                                    <span className="mt-1 block text-[#17233B]/65">
                                        Customers can claim it any time. Staff can only mark
                                        it used inside these times (UK time).
                                    </span>
                                </span>
                            </label>
                        ) : (
                            <div className="flex gap-3 rounded-xl border border-dashed border-[#17233B]/20 p-4 text-sm">
                                <FiLock aria-hidden="true" className="mt-0.5 shrink-0 text-[#17233B]/65" />

                                <p className="text-[#17233B]/65">
                                    <strong className="text-[#17233B]">
                                        Only let staff redeem it at these times
                                    </strong>{" "}
                                    holds your staff to the window at the till, so a
                                    quiet-hours offer can&apos;t be used at six on a
                                    Saturday.{" "}
                                    <Link
                                        href={`/business/${businessId}/billing`}
                                        className="font-medium text-[#FF593F] underline"
                                    >
                                        Available on Growth
                                    </Link>
                                    . The days and times above are yours either way.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </fieldset>

            <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Who is it for?</legend>

                <div className="grid gap-2 sm:grid-cols-2">
                    {audienceOptions.map((option) => (
                        <Choice
                            key={option.value}
                            id={`audience-${option.value}`}
                            value={option.value}
                            label={option.label}
                            registration={register("audience")}
                        />
                    ))}
                </div>
            </fieldset>

            <p className="text-xs leading-5 text-[#17233B]/70">
                On your card:{" "}
                <strong className="font-semibold text-[#17233B]">{line}</strong>
            </p>

            {/* Stock is the claim limit's job, and anything stranger
                belongs in the terms. */}
            <p className="text-xs leading-5 text-muted-foreground">
                Running out is what the claim limit below is for. Anything else
                unusual about using it belongs in the terms.
            </p>
        </div>
    );
}

export function OfferFields({
    register,
    errors,
    control,
    setValue,
    getValues,
    businessId,
    canSchedule,
    defaultCategoryId,
    currentLine,
    minRedemptions = 0,
}: {
    register: UseFormRegister<OfferInput>;
    errors: FieldErrors<OfferInput>;
    control: Control<OfferInput, unknown, OfferValues>;
    setValue: UseFormSetValue<OfferInput>;
    getValues: UseFormGetValues<OfferInput>;
    businessId: string;
    canSchedule: boolean;
    defaultCategoryId?: string | null;
    // The line a legacy offer shows today; see OfferAvailabilityFields.
    currentLine?: string | null;
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

                {/* react-hook-form's generics are invariant, so the big
                    form's register and control don't describe themselves
                    as the smaller form's. The field names and rules are
                    the same object (kindFields) either way, which is what
                    makes this safe. */}
                <OfferKindFields
                    register={register as unknown as UseFormRegister<KindInput>}
                    errors={errors as FieldErrors<KindInput>}
                    control={control as unknown as Control<KindInput, unknown, unknown>}
                />
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

            {/* Same invariance as the kind picker above: the names and
                rules are the same object (availabilityFields). */}
            <OfferAvailabilityFields
                register={register as unknown as UseFormRegister<AvailabilityInput>}
                errors={errors as FieldErrors<AvailabilityInput>}
                control={control as unknown as Control<AvailabilityInput, unknown, unknown>}
                setValue={setValue as unknown as UseFormSetValue<AvailabilityInput>}
                getValues={getValues as unknown as UseFormGetValues<AvailabilityInput>}
                businessId={businessId}
                canSchedule={canSchedule}
                currentLine={currentLine}
            />

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
