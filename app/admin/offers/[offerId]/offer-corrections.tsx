"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type {
    Control,
    FieldErrors,
    UseFormGetValues,
    UseFormRegister,
    UseFormSetValue,
} from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    OfferAvailabilityFields,
    OfferKindFields,
    offerCorrectionSchema,
    type AvailabilityInput,
    type CorrectionInput,
    type KindInput,
} from "@/components/offer-fields";
import { Separator } from "@/components/ui/separator";
import { correctOffer } from "../actions";

// Putting an offer's type and availability right, without the business.
//
// Both were backfilled from words somebody typed, and the rules left
// what they couldn't read alone: "£10 credit" has no type, "Tuesday to
// Thursday evenings" has no days. Until one of us or the business
// answers the pickers, those offers sit outside the type filter and say
// whatever they said before.
//
// The same pickers the business sees, so a corrected offer is shaped
// exactly like one that was made with them. Neither of these fields is
// reviewed (docs/OFFER-EDIT-REVIEW.md), so this saves straight to a live
// offer; an admin is exempt from the review trigger in any case.
export function OfferCorrections({
    offerId,
    businessId,
    kind,
    kindValue,
    kindQuantity,
    kindItem,
    discount,
    availableDays,
    availableFrom,
    availableUntil,
    audience,
    enforcedAtTill,
}: {
    offerId: string;
    businessId: string;
    kind: string;
    kindValue: number | null;
    kindQuantity: number | null;
    kindItem: string | null;
    discount: string;
    availableDays: number[] | null;
    availableFrom: string | null;
    availableUntil: string | null;
    audience: string;
    // The offer has a window the till holds staff to. This form doesn't
    // touch it, and says so rather than letting the two drift apart
    // quietly.
    enforcedAtTill: boolean;
}) {
    const router = useRouter();
    const [saved, setSaved] = useState<{ discount: string; availability: string } | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        control,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<CorrectionInput>({
        resolver: zodResolver(offerCorrectionSchema()),
        defaultValues: {
            kind,
            kindValue: kindValue === null ? "" : String(kindValue),
            kindQuantity: kindQuantity === null ? "" : String(kindQuantity),
            kindItem: kindItem ?? "",
            // An offer with no real type keeps its headline as written,
            // so "Something else" opens on what customers see.
            discount: kind === "other" ? discount : "",
            when: availableFrom || availableUntil ? "times" : availableDays?.length ? "days" : "any",
            availableDays: availableDays ?? [],
            availableFrom: (availableFrom ?? "").slice(0, 5),
            availableUntil: (availableUntil ?? "").slice(0, 5),
            audience: audience === "new_customers" ? "new_customers" : "everyone",
            // Not shown here: the till's window is the business's to ask
            // for, on its own plan.
            enforceSchedule: false,
        },
    });

    return (
        <form
            noValidate
            className="space-y-5"
            onSubmit={handleSubmit(async (values) => {
                setErrorMessage("");
                setSaved(null);

                const result = await correctOffer(offerId, values);

                if (result.error) {
                    setErrorMessage(result.error);
                    return;
                }

                setSaved({ discount: result.discount!, availability: result.availability! });
                router.refresh();
            })}
        >
            {/* react-hook-form's generics are invariant, so this form's
                helpers don't describe themselves as either picker's. The
                field names and rules are the same objects (kindFields,
                availabilityFields), which is what makes it safe. */}
            <OfferKindFields
                register={register as unknown as UseFormRegister<KindInput>}
                errors={errors as FieldErrors<KindInput>}
                control={control as unknown as Control<KindInput, unknown, unknown>}
            />

            <Separator />

            <OfferAvailabilityFields
                register={register as unknown as UseFormRegister<AvailabilityInput>}
                errors={errors as FieldErrors<AvailabilityInput>}
                control={control as unknown as Control<AvailabilityInput, unknown, unknown>}
                setValue={setValue as unknown as UseFormSetValue<AvailabilityInput>}
                getValues={getValues as unknown as UseFormGetValues<AvailabilityInput>}
                businessId={businessId}
                // The tick-box is the business's to ask for; this form
                // only writes what the card says.
                canSchedule={false}
                hideEnforcement
            />

            {enforcedAtTill && (
                <p className="text-sm text-[#17233B]/65">
                    This offer&apos;s voucher refuses to be marked used outside its
                    window. That window is separate and isn&apos;t changed here — if
                    these days and times no longer match it, the business needs to
                    save the offer itself.
                </p>
            )}

            {errorMessage && (
                <Alert variant="destructive">
                    <AlertTitle>Unable to save</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            {saved && (
                <Alert className="border-emerald-200 bg-emerald-50">
                    <AlertTitle>Saved</AlertTitle>

                    <AlertDescription>
                        The card now reads “{saved.discount}”, {saved.availability.toLowerCase()}.
                    </AlertDescription>
                </Alert>
            )}

            <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? "Saving…" : "Save the type and availability"}
            </Button>
        </form>
    );
}
