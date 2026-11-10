"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HoursFields } from "@/components/hours-fields";
import { hoursRowsFor, hoursSchema, type DayValues, type HoursValues } from "@/lib/business-hours";
import { savingProblem, tryToSave } from "@/lib/saving";
import { createClient } from "@/utils/supabase/client";

type Values = HoursValues;

export default function HoursForm({
    businessId,
    businessName,
    initialDays,
    isFirstTime,
    returnTo,
}: {
    businessId: string;
    businessName: string;
    initialDays: DayValues[];
    isFirstTime: boolean;
    // Where Back and saving go: Edit business when they came from there.
    returnTo?: string;
}) {
    const router = useRouter();
    const back = returnTo ?? `/business/${businessId}`;
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting, isSubmitted },
    } = useForm<Values>({
        resolver: zodResolver(hoursSchema),
        defaultValues: { days: initialDays },
    });

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const rows = hoursRowsFor(businessId, values.days);

        const supabase = createClient();

        const saved = await tryToSave(() =>
            supabase.from("business_hours").upsert(rows, { onConflict: "business_id,day_of_week" }),
        );

        if (saved.error) {
            setErrorMessage(savingProblem(saved));
            return;
        }

        // Back where they came from: the setup steps tick this one off.
        router.push(back);
        router.refresh();
    }

    return (
        <div className="text-[#17233B]">
            <div>
                <BackButton href={back} />

                <div className="mt-8">
                    <h1 className="text-4xl font-semibold tracking-tight">
                        {isFirstTime ? "Set your opening hours" : "Opening hours"}
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Shown on {businessName}&apos;s page so nobody turns up to a closed door. Choose open
                        or closed for each day.
                    </p>
                </div>

                <Card className="mt-10 border-[#17233B]/10">
                    <CardContent className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                            <HoursFields
                                control={control}
                                register={register}
                                setValue={setValue}
                                errors={errors.days}
                                revalidate={isSubmitted}
                            />

                            {errors.days && (
                                <p role="alert" className="text-sm text-destructive">
                                    Finish the highlighted days to save.
                                </p>
                            )}

                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Unable to save your hours</AlertTitle>
                                    <AlertDescription>{errorMessage}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                                {isSubmitting ? "Saving hours…" : "Save hours"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
