"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiGift, FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DISMISSED_KEY, type Announcement } from "@/lib/announcements";
import { createClient } from "@/utils/supabase/client";

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// The number of days in a month, ignoring leap years: a birthday is a day
// and a month, so 29 February has to be allowed.
function daysIn(month: number) {
    return month === 2 ? 29 : [4, 6, 9, 11].includes(month) ? 30 : 31;
}

// Asks the two questions and saves them. Only a day and a month: a
// birthday treat doesn't need to know how old anyone is.
function BirthdayDialog({
    open,
    onOpenChange,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) {
    const [day, setDay] = useState("");
    const [month, setMonth] = useState("");
    const [saving, setSaving] = useState(false);
    const [problem, setProblem] = useState("");

    const chosenMonth = Number(month);
    const tooLate = Boolean(day && chosenMonth && Number(day) > daysIn(chosenMonth));
    const ready = Boolean(day && month) && !tooLate;

    async function save() {
        if (!ready || saving) return;

        setSaving(true);
        setProblem("");

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setProblem("Please sign in again and try once more.");
            setSaving(false);
            return;
        }

        const { error } = await supabase.from("customer_birthdays").upsert({
            user_id: user.id,
            birth_month: chosenMonth,
            birth_day: Number(day),
            updated_at: new Date().toISOString(),
        });

        if (error) {
            setProblem("We couldn't save that. Please try again.");
            setSaving(false);
            return;
        }

        onSaved();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogTitle className="text-xl font-semibold">When&apos;s your birthday?</DialogTitle>

                <p className="text-sm leading-6 text-[#17233B]/70">
                    The day and the month. We never ask for the year, and
                    businesses only see it when they send you something.
                </p>

                <div className="mt-2 grid grid-cols-[7rem_1fr] gap-3">
                    <span className="space-y-1.5">
                        <Label htmlFor="announcement-birth-day">Day</Label>
                        <select
                            id="announcement-birth-day"
                            value={day}
                            onChange={(event) => setDay(event.target.value)}
                            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        >
                            <option value="">Day</option>
                            {Array.from({ length: 31 }, (_, index) => index + 1).map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                    </span>

                    <span className="space-y-1.5">
                        <Label htmlFor="announcement-birth-month">Month</Label>
                        <select
                            id="announcement-birth-month"
                            value={month}
                            onChange={(event) => setMonth(event.target.value)}
                            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        >
                            <option value="">Month</option>
                            {months.map((name, index) => (
                                <option key={name} value={index + 1}>{name}</option>
                            ))}
                        </select>
                    </span>
                </div>

                {(tooLate || problem) && (
                    <p role="alert" className="text-sm text-destructive">
                        {tooLate ? "That date doesn't exist." : problem}
                    </p>
                )}

                <div className="mt-2 flex flex-wrap gap-3">
                    <Button type="button" size="lg" disabled={!ready || saving} onClick={save}>
                        {saving ? "Saving…" : "Save"}
                    </Button>

                    <Button
                        type="button"
                        size="lg"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                </div>

                <p className="text-xs leading-6 text-[#17233B]/60">
                    You can change or remove it any time in{" "}
                    <Link href="/account/profile" className="underline underline-offset-4">
                        your profile
                    </Link>
                    .
                </p>
            </DialogContent>
        </Dialog>
    );
}

// One nudge at the top of the customer area: what's worth doing, a button
// that does it, and a way to say not now that we remember.
export function AnnouncementBar({ announcement }: { announcement: Announcement }) {
    const router = useRouter();
    const [gone, setGone] = useState(false);
    const [asking, setAsking] = useState(false);

    if (gone) return null;

    // Kept on the account, so "not now" holds on every device. It is only
    // a nudge, so a failure here just closes it for now.
    async function dismiss() {
        setGone(true);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const dismissed = new Set<string>(
            Array.isArray(user?.user_metadata?.[DISMISSED_KEY])
                ? (user.user_metadata[DISMISSED_KEY] as string[])
                : [],
        );

        dismissed.add(announcement.id);
        await supabase.auth.updateUser({ data: { [DISMISSED_KEY]: [...dismissed] } });
    }

    return (
        <aside
            aria-label="Suggestion"
            className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#FF593F]/20 bg-[#FFF4E8] p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
        >
            <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF593F]"
            >
                <FiGift className="size-5" />
            </span>

            <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#17233B]">{announcement.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#17233B]/70">{announcement.body}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {"opens" in announcement.action ? (
                    <Button type="button" onClick={() => setAsking(true)}>
                        {announcement.action.label}
                    </Button>
                ) : (
                    <Button render={<Link href={announcement.action.href} />} nativeButton={false}>
                        {announcement.action.label}
                    </Button>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Dismiss this suggestion"
                    onClick={dismiss}
                >
                    <FiX aria-hidden="true" className="size-5" />
                </Button>
            </div>

            {"opens" in announcement.action && announcement.action.opens === "birthday" && (
                <BirthdayDialog
                    open={asking}
                    onOpenChange={setAsking}
                    onSaved={() => {
                        setAsking(false);
                        setGone(true);
                        router.refresh();
                    }}
                />
            )}
        </aside>
    );
}
