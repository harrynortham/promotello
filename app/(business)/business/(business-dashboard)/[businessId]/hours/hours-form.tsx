"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, invalidProps } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { WEEK, daySchema, type DayValues } from "@/lib/business-hours";
import { createClient } from "@/utils/supabase/client";

const schema = z.object({ days: z.array(daySchema).length(7) });
type Values = z.input<typeof schema>;

function StatusButton({
    pressed,
    onClick,
    children,
}: {
    pressed: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={onClick}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition ${pressed
                ? "bg-[#17233B] text-white"
                : "text-[#17233B]/70 hover:bg-[#17233B]/5 hover:text-[#17233B]"
                }`}
        >
            {children}
        </button>
    );
}

function DayRow({
    index,
    name,
    control,
    register,
    setValue,
    errors,
    revalidate,
}: {
    index: number;
    name: string;
    control: Control<Values>;
    register: UseFormRegister<Values>;
    setValue: UseFormSetValue<Values>;
    errors?: { status?: { message?: string }; closesAt?: { message?: string } };
    // After a failed save, check each change straight away so errors clear.
    revalidate: boolean;
}) {
    const [status, opensAt, closesAt] = useWatch({
        control,
        name: [`days.${index}.status`, `days.${index}.opensAt`, `days.${index}.closesAt`],
    });

    function choose(next: DayValues["status"]) {
        const options = { shouldDirty: true, shouldValidate: revalidate };
        // Opening a day starts at 9am to 5pm, ready to adjust.
        if (next === "open") {
            if (!opensAt) setValue(`days.${index}.opensAt`, "09:00", options);
            if (!closesAt) setValue(`days.${index}.closesAt`, "17:00", options);
        }
        setValue(`days.${index}.status`, next, options);
    }
    const error = errors?.status?.message ?? errors?.closesAt?.message;

    return (
        // Open days are white, closed days grey, and unset days cream.
        <li className={`rounded-2xl border p-4 transition sm:p-5 ${error ? "border-destructive/50" : "border-[#17233B]/10"} ${status === "open" ? "bg-white" : status === "closed" ? "bg-[#17233B]/[0.06]" : "bg-[#FFF8F0]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className={`font-semibold ${status === "closed" ? "text-[#17233B]/60" : ""}`}>{name}</p>
                    {!status && <p className="text-xs text-[#17233B]/60">Not set yet</p>}
                    {status === "closed" && <p className="text-xs text-[#17233B]/60">Closed all day</p>}
                </div>

                <div role="group" aria-label={`${name} open or closed`} className="inline-flex rounded-full border border-[#17233B]/15 bg-white p-1">
                    <StatusButton pressed={status === "open"} onClick={() => choose("open")}>
                        Open
                    </StatusButton>
                    <StatusButton pressed={status === "closed"} onClick={() => choose("closed")}>
                        Closed
                    </StatusButton>
                </div>
            </div>

            {status === "open" && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Input
                        type="time"
                        aria-label={`${name} opens`}
                        className="w-auto"
                        {...register(`days.${index}.opensAt`)}
                    />
                    <span className="text-sm text-[#17233B]/65">to</span>
                    <Input
                        type="time"
                        aria-label={`${name} closes`}
                        className="w-auto"
                        {...register(`days.${index}.closesAt`)}
                        {...invalidProps(`day-${index}-error`, error ? { message: error } : undefined)}
                    />
                </div>
            )}

            <div className="mt-2">
                <FieldError id={`day-${index}-error`} message={error} />
            </div>
        </li>
    );
}

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
    returnTo?: { href: string; label: string };
}) {
    const router = useRouter();
    const back = returnTo ?? { href: `/business/${businessId}`, label: "Back to dashboard" };
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting, isSubmitted },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { days: initialDays },
    });

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const rows = values.days.map((day, index) => ({
            business_id: businessId,
            day_of_week: WEEK[index].dayOfWeek,
            is_closed: day.status === "closed",
            opens_at: day.status === "open" ? day.opensAt : null,
            closes_at: day.status === "open" ? day.closesAt : null,
        }));

        const { error } = await createClient()
            .from("business_hours")
            .upsert(rows, { onConflict: "business_id,day_of_week" });

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        // Back where they came from: the setup steps tick this one off.
        router.push(back.href);
        router.refresh();
    }

    return (
        <div className="text-[#17233B]">
            <div className="mx-auto max-w-2xl">
                <Button
                    render={<Link href={back.href} />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← {back.label}
                </Button>

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
                            <ul className="space-y-3">
                                {WEEK.map((day, index) => (
                                    <DayRow
                                        key={day.dayOfWeek}
                                        index={index}
                                        name={day.name}
                                        control={control}
                                        register={register}
                                        setValue={setValue}
                                        errors={errors.days?.[index]}
                                        revalidate={isSubmitted}
                                    />
                                ))}
                            </ul>

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
