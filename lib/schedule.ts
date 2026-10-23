// Quiet-hours schedules: offers that repeat on set weekdays within a time
// window, in UK time. Days are 0 (Sunday) to 6 (Saturday), like the database.

export type OfferSchedule = {
    days: number[];
    start: string; // "14:00" or "14:00:00"
    end: string;
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
