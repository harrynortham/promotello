"use client";

import {
    useWatch,
    type Control,
    type FieldErrors,
    type UseFormRegister,
    type UseFormSetValue,
} from "react-hook-form";

import { FieldError, invalidProps } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { WEEK, type DayValues, type HoursValues } from "@/lib/business-hours";

// The seven days, open or closed, with times where they are open. Shared
// by the hours page and the setup flow, which ask for exactly the same
// thing and shouldn't drift apart.

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
    control: Control<HoursValues>;
    register: UseFormRegister<HoursValues>;
    setValue: UseFormSetValue<HoursValues>;
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
        <li className={`rounded-xl border p-4 transition sm:p-5 ${error ? "border-destructive/50" : "border-[#17233B]/10"} ${status === "open" ? "bg-white" : status === "closed" ? "bg-[#17233B]/[0.06]" : "bg-[#FFF8F0]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className={`font-semibold ${status === "closed" ? "text-[#17233B]/65" : ""}`}>{name}</p>
                    {!status && <p className="text-xs text-[#17233B]/65">Not set yet</p>}
                    {status === "closed" && <p className="text-xs text-[#17233B]/65">Closed all day</p>}
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


export function HoursFields({
    control,
    register,
    setValue,
    errors,
    revalidate,
}: {
    control: Control<HoursValues>;
    register: UseFormRegister<HoursValues>;
    setValue: UseFormSetValue<HoursValues>;
    errors?: FieldErrors<HoursValues>["days"];
    revalidate: boolean;
}) {
    return (
        <ul className="space-y-3">
            {WEEK.map((day, index) => (
                <DayRow
                    key={day.dayOfWeek}
                    index={index}
                    name={day.name}
                    control={control}
                    register={register}
                    setValue={setValue}
                    errors={errors?.[index]}
                    revalidate={revalidate}
                />
            ))}
        </ul>
    );
}
