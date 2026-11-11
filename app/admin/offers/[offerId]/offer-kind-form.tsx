"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OfferKindFields, offerKindSchema, type KindInput } from "@/components/offer-fields";
import { correctOfferKind } from "../actions";

// Setting an offer's type by hand. The backfill left the headlines it
// could not read as "Something else" — "£10 credit", "3rd half price" —
// and this is where they get a real type, so they turn up in the
// customer's type filter.
//
// The same picker the business sees, so a corrected offer is shaped
// exactly like one that was created with a type. The headline is rebuilt
// from the type on the server, and an offer whose type we change does not
// go back for review: an admin is exempt from the trigger.
export function OfferKindForm({
    offerId,
    kind,
    kindValue,
    kindQuantity,
    kindItem,
    discount,
}: {
    offerId: string;
    kind: string;
    kindValue: number | null;
    kindQuantity: number | null;
    kindItem: string | null;
    discount: string;
}) {
    const router = useRouter();
    const [saved, setSaved] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<KindInput>({
        resolver: zodResolver(offerKindSchema()),
        defaultValues: {
            kind,
            kindValue: kindValue === null ? "" : String(kindValue),
            kindQuantity: kindQuantity === null ? "" : String(kindQuantity),
            kindItem: kindItem ?? "",
            // An offer that has no real type keeps its headline as it was
            // written, so "Something else" opens on what customers see.
            discount: kind === "other" ? discount : "",
        },
    });

    return (
        <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
                setErrorMessage("");
                setSaved("");

                const result = await correctOfferKind(offerId, values);

                if (result.error) {
                    setErrorMessage(result.error);
                    return;
                }

                setSaved(result.discount ?? "");
                router.refresh();
            })}
        >
            <OfferKindFields register={register} errors={errors} control={control} />

            {errorMessage && (
                <Alert variant="destructive">
                    <AlertTitle>Unable to save the type</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            {saved && (
                <Alert className="border-emerald-200 bg-emerald-50">
                    <AlertTitle>Saved</AlertTitle>
                    <AlertDescription>The headline now reads “{saved}”.</AlertDescription>
                </Alert>
            )}

            <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? "Saving…" : "Save the type"}
            </Button>
        </form>
    );
}
