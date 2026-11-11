// When an offer can be used, and who it is for.
//
// Two things live here, and the difference matters:
//
// - **Availability** (available_days/from/until, audience) is what the
//   card says. Every business sets it, on any plan, and
//   availabilityLine() writes the one line customers read. Nothing else
//   assembles that line.
// - **The schedule** (schedule_days/start/end) is the window the till
//   enforces, which is part of Growth. It is written from the
//   availability columns by enforcedSchedule() when the business ticks
//   the box, and is otherwise null.
//
// Days are 0 (Sunday) to 6 (Saturday), like the database. Times are UK
// time, "14:00" or "14:00:00" — both are read the same way.

export type OfferSchedule = {
    days: number[];
    start: string; // "14:00" or "14:00:00"
    end: string;
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// One day on its own gets its whole name, and all of these are plural: a
// repeating offer runs every Saturday, where "Saturday" would read as
// the one coming. It is also how businesses write them — "Saturdays",
// "Fridays", "Weekdays" are all live on cards today.
const everyDayNames = [
    "Sundays",
    "Mondays",
    "Tuesdays",
    "Wednesdays",
    "Thursdays",
    "Fridays",
    "Saturdays",
];

// Week order for display: Monday first.
export const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];

export function scheduleFrom(
    days: number[] | null | undefined,
    start: string | null | undefined,
    end: string | null | undefined,
): OfferSchedule | null {
    return days?.length && start && end ? { days, start, end } : null;
}

function formatTime(value: string) {
    const [hours, minutes] = value.split(":").map(Number);

    // 12pm and 12am are the two times people read twice to be sure of.
    if (!minutes && hours === 12) return "noon";
    if (!minutes && (hours === 0 || hours === 24)) return "midnight";

    const suffix = hours >= 12 ? "pm" : "am";
    const hour = hours % 12 || 12;
    return minutes ? `${hour}:${String(minutes).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

// "Mon–Thu", "Mon, Wed, Fri" or "Every day".
function formatDays(days: number[]) {
    const ordered = weekdayOrder.filter((day) => days.includes(day));

    if (ordered.length === 7) return "Every day";

    const positions = ordered.map((day) => weekdayOrder.indexOf(day));
    const consecutive = positions.every((position, index) => index === 0 || position === positions[index - 1] + 1);

    if (consecutive && ordered.length > 2) {
        return `${dayNames[ordered[0]]}–${dayNames[ordered[ordered.length - 1]]}`;
    }

    return ordered.map((day) => dayNames[day]).join(", ");
}

// "Mon–Thu, 2pm–4pm"
export function formatSchedule(schedule: OfferSchedule) {
    return `${formatDays(schedule.days)}, ${formatTime(schedule.start)}–${formatTime(schedule.end)}`;
}

// ---------------------------------------------------------------------------
// Availability: the line customers read
// ---------------------------------------------------------------------------

export type OfferAudience = "everyone" | "new_customers";

export type AvailabilityParts = {
    // Null or empty means every day, and so does all seven.
    days?: number[] | null;
    // Null means from opening / until closing.
    from?: string | null;
    until?: string | null;
    audience?: OfferAudience | string | null;
};

export function isAudience(value: string | null | undefined): value is OfferAudience {
    return value === "everyone" || value === "new_customers";
}

// Days worth naming: none, and all seven, both mean "every day", so
// neither is worth saying on its own.
function chosenDays(days: number[] | null | undefined) {
    const chosen = weekdayOrder.filter((day) => days?.includes(day));

    return chosen.length === 0 || chosen.length === 7 ? null : chosen;
}

// Days said the way a person would say them: one day in full, Monday to
// Friday as "Weekdays", Saturday and Sunday as "Weekends". Anything else
// is a range or a list, which is short enough to read at a glance and
// has no name of its own.
//
// Only here: formatSchedule() is the window the till enforces and keeps
// saying "Mon–Fri", because that is a list of days staff are held to
// rather than a phrase on a card.
function namedDays(days: number[]) {
    const has = (day: number) => days.includes(day);

    if (days.length === 1) return everyDayNames[days[0]];
    if (days.length === 5 && [1, 2, 3, 4, 5].every(has)) return "Weekdays";
    if (days.length === 2 && has(6) && has(0)) return "Weekends";

    const run = days.length > 2 ? runOfDays(days) : null;

    if (run) return `${dayNames[run[0]]}–${dayNames[run[run.length - 1]]}`;

    return formatDays(days);
}

// A run of days in order, wherever in the week it starts. Sunday to
// Thursday is how a hotel says it, and the week we show starts on
// Monday, so without this it comes out as a list of five: "Mon, Tue,
// Wed, Thu, Sun".
function runOfDays(days: number[]) {
    for (const start of days) {
        const run = Array.from({ length: days.length }, (_, step) => (start + step) % 7);

        if (run.every((day) => days.includes(day))) return run;
    }

    return null;
}

// "Weekdays, until 10am", "Every day, 2pm–4pm", "Any time · New
// customers only". The one place this line is assembled.
export function availabilityLine({ days, from, until, audience }: AvailabilityParts): string {
    const chosen = chosenDays(days);
    const times = from && until
        ? `${formatTime(from)}–${formatTime(until)}`
        : from
            ? `from ${formatTime(from)}`
            : until
                ? `until ${formatTime(until)}`
                : null;

    // With a time, the days are always said — "Every day" when they are
    // all of them, because "2pm–4pm" on its own reads like today only.
    const line = times
        ? `${chosen ? namedDays(chosen) : "Every day"}, ${times}`
        : chosen
            ? namedDays(chosen)
            : "Any time";

    return audience === "new_customers" ? `${line} · New customers only` : line;
}

// What the availability columns hold, with anything the chosen "when"
// doesn't use cleared: going back to "Any time" takes the days and times
// with it rather than leaving them to come back later.
export function availabilityParts(values: {
    when?: string | null;
    availableDays?: number[] | null;
    availableFrom?: string | null;
    availableUntil?: string | null;
    audience?: string | null;
}) {
    const audience = values.audience === "new_customers" ? "new_customers" : "everyone";

    if (values.when !== "days" && values.when !== "times") {
        return { days: null, from: null, until: null, audience } as const;
    }

    const days = weekdayOrder.filter((day) => values.availableDays?.includes(day)).sort((a, b) => a - b);
    const timed = values.when === "times";

    return {
        days: days.length > 0 ? days : null,
        from: (timed && values.availableFrom) || null,
        until: (timed && values.availableUntil) || null,
        audience,
    } as const;
}

// The till's window, written from the availability. The schedule check
// has no room for a gap — it wants days and both ends — so an open end
// becomes the edge of the day.
//
// Not enforced means no schedule at all, which is what every offer on
// every plan but Growth has.
export function enforcedSchedule(
    { days, from, until }: Omit<AvailabilityParts, "audience">,
    enforce: boolean,
) {
    const chosen = weekdayOrder.filter((day) => days?.includes(day));
    const hasWindow = chosen.length > 0 || Boolean(from) || Boolean(until);

    if (!enforce || !hasWindow) {
        return { schedule_days: null, schedule_start: null, schedule_end: null };
    }

    return {
        schedule_days: chosen.length > 0 ? chosen : [...weekdayOrder].sort((a, b) => a - b),
        schedule_start: from || "00:00",
        schedule_end: until || "23:59:59",
    };
}

// An offer whose stored line isn't the one its columns would write was
// made before the pickers existed — "Weekdays before 10am", "First visit
// only". There is no flag for it: this is the test.
export function isLegacyAvailability(availability: string, parts: AvailabilityParts) {
    return availability.trim() !== availabilityLine(parts);
}
