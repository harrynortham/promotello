"use client";

import Link from "next/link";
import { useState } from "react";
import { FiClock, FiLock } from "react-icons/fi";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSchedule, weekdayOrder, type OfferSchedule } from "@/lib/schedule";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The "repeat on set days and times" part of the offer forms. Submits
// scheduleDays (comma-separated), scheduleStart and scheduleEnd, or nothing
// when switched off. Read them with scheduleFromForm().
export function OfferScheduleFields({
    businessId,
    canSchedule,
    initial,
}: {
    businessId: string;
    canSchedule: boolean;
    initial: OfferSchedule | null;
}) {
    const [enabled, setEnabled] = useState(Boolean(initial));
    const [days, setDays] = useState<number[]>(initial?.days ?? [1, 2, 3, 4]);
    const [start, setStart] = useState(initial?.start.slice(0, 5) ?? "14:00");
    const [end, setEnd] = useState(initial?.end.slice(0, 5) ?? "16:00");

    if (!canSchedule) {
        return (
            <div className="flex gap-3 rounded-xl border border-dashed border-[#17233B]/20 p-4 text-sm">
                <FiLock aria-hidden="true" className="mt-0.5 shrink-0 text-[#17233B]/65" />
                <p className="text-[#17233B]/65">
                    <strong className="text-[#17233B]">Quiet-hours offers</strong> repeat on the days and
                    times you choose, like Monday to Thursday, 2pm to 4pm, to fill your quieter moments.{" "}
                    <Link href={`/business/${businessId}/billing`} className="font-medium text-[#C8371D] underline">
                        Available on Growth
                    </Link>
                    .
                </p>
            </div>
        );
    }

    const valid = days.length > 0 && start < end;

    return (
        <fieldset className="rounded-xl border border-[#17233B]/10 p-4">
            <label className="flex items-center gap-3 text-sm font-medium">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                    className="size-4 accent-[#FF593F]"
                />
                <FiClock aria-hidden="true" className="text-[#C8371D]" />
                Only on set days and times (quiet hours)
            </label>

            {enabled && (
                <div className="mt-4 space-y-4">
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
                                        onClick={() =>
                                            setDays((current) =>
                                                on ? current.filter((value) => value !== day) : [...current, day],
                                            )
                                        }
                                        className={`rounded-full border px-3 py-1 text-sm ${on ? "border-[#FF593F] bg-[#C8371D] text-white" : "border-[#17233B]/15 bg-white"}`}
                                    >
                                        {dayLabels[day]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid max-w-sm grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="scheduleStart">From</Label>
                            <Input id="scheduleStart" type="time" value={start} onChange={(event) => setStart(event.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="scheduleEnd">Until</Label>
                            <Input id="scheduleEnd" type="time" value={end} onChange={(event) => setEnd(event.target.value)} required />
                        </div>
                    </div>

                    <p className={`text-sm ${valid ? "text-[#17233B]/65" : "text-red-700"}`}>
                        {valid
                            ? `Customers can claim it any time, and use it ${formatSchedule({ days, start, end })} (UK time).`
                            : "Pick at least one day, and an end time after the start time."}
                    </p>

                    <input type="hidden" name="scheduleDays" value={days.join(",")} />
                    <input type="hidden" name="scheduleStart" value={start} />
                    <input type="hidden" name="scheduleEnd" value={end} />
                </div>
            )}
        </fieldset>
    );
}

// Reads the fields above from a submitted form: the offer's schedule
// columns, all null when it isn't scheduled.
export function scheduleFromForm(formData: FormData) {
    const days = String(formData.get("scheduleDays") ?? "")
        .split(",")
        .filter(Boolean)
        .map(Number);
    const start = String(formData.get("scheduleStart") ?? "");
    const end = String(formData.get("scheduleEnd") ?? "");

    if (days.length === 0 || !start || !end) {
        return { schedule_days: null, schedule_start: null, schedule_end: null };
    }

    return { schedule_days: days, schedule_start: start, schedule_end: end };
}
