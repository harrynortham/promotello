import { z } from "zod";

// day_of_week is 0 for Sunday, as in Postgres. The week is shown Monday first.
export const WEEK = [
    { dayOfWeek: 1, name: "Monday" },
    { dayOfWeek: 2, name: "Tuesday" },
    { dayOfWeek: 3, name: "Wednesday" },
    { dayOfWeek: 4, name: "Thursday" },
    { dayOfWeek: 5, name: "Friday" },
    { dayOfWeek: 6, name: "Saturday" },
    { dayOfWeek: 0, name: "Sunday" },
];

export type HoursRow = {
    day_of_week: number;
    is_closed: boolean;
    opens_at: string | null;
    closes_at: string | null;
};

// A day is unset ("") until the owner picks open or closed.
export const daySchema = z
    .object({
        status: z.enum(["", "open", "closed"]),
        opensAt: z.string(),
        closesAt: z.string(),
    })
    .superRefine((day, context) => {
        if (day.status === "") {
            context.addIssue({ code: "custom", path: ["status"], message: "Choose open or closed." });
        } else if (day.status === "open") {
            if (!day.opensAt || !day.closesAt) {
                context.addIssue({ code: "custom", path: ["closesAt"], message: "Add an opening and a closing time." });
            } else if (day.opensAt >= day.closesAt) {
                // The database needs closing after opening, so hours can't run past midnight.
                context.addIssue({ code: "custom", path: ["closesAt"], message: "The closing time must be after the opening time." });
            }
        }
    });

export type DayValues = z.input<typeof daySchema>;

// A week of them, which is what every form that sets hours collects.
export const hoursSchema = z.object({ days: z.array(daySchema).length(7) });

export type HoursValues = z.input<typeof hoursSchema>;

// What the business_hours table wants, from what the form collects.
export function hoursRowsFor(businessId: string, days: DayValues[]) {
    return days.map((day, index) => ({
        business_id: businessId,
        day_of_week: WEEK[index].dayOfWeek,
        is_closed: day.status === "closed",
        opens_at: day.status === "open" ? day.opensAt : null,
        closes_at: day.status === "open" ? day.closesAt : null,
    }));
}

// Saved rows, in WEEK order, as form values. Days with no row stay unset.
export function hoursToValues(rows: HoursRow[]): DayValues[] {
    return WEEK.map(({ dayOfWeek }) => {
        const row = rows.find((item) => item.day_of_week === dayOfWeek);
        if (!row) return { status: "", opensAt: "", closesAt: "" };
        return {
            status: row.is_closed ? "closed" : "open",
            opensAt: row.opens_at?.slice(0, 5) ?? "",
            closesAt: row.closes_at?.slice(0, 5) ?? "",
        };
    });
}

// "9:00am", "5:30pm"
export function formatHour(value: string) {
    const [hours, minutes] = value.split(":").map(Number);
    const suffix = hours < 12 ? "am" : "pm";
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")}${suffix}`;
}

// Open or shut, right now, in words.
//
// For the bio page, where "Opening hours" is a link somebody has to
// press to learn the one thing they wanted. Everything here is Europe/
// London: the whole directory is one country, and a café's closing time
// is a local fact rather than an instant.
//
// A day that runs past midnight closes the next morning, so a bar open
// until 1am is open at half past midnight rather than shut all day.
export function openingLabel(rows: HoursRow[], now = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const at = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = days.indexOf(at("weekday"));
    const minutes = Number(at("hour")) * 60 + Number(at("minute"));

    if (today === -1) return "Opening hours";

    const dayFor = (offset: number) =>
        rows.find((row) => row.day_of_week === (today + offset + 7) % 7);

    const asMinutes = (value: string) => {
        const [hours, mins] = value.split(":").map(Number);
        return hours * 60 + mins;
    };

    // Still inside yesterday's late closing.
    const yesterday = dayFor(-1);
    if (yesterday && !yesterday.is_closed && yesterday.opens_at && yesterday.closes_at) {
        const opens = asMinutes(yesterday.opens_at);
        const closes = asMinutes(yesterday.closes_at);
        if (closes < opens && minutes < closes) return `Open until ${formatHour(yesterday.closes_at)}`;
    }

    const day = dayFor(0);
    if (!day || day.is_closed || !day.opens_at || !day.closes_at) return "Closed today";

    const opens = asMinutes(day.opens_at);
    const closes = asMinutes(day.closes_at);
    const overnight = closes < opens;

    if (minutes < opens) return `Opens at ${formatHour(day.opens_at)}`;
    if (overnight || minutes < closes) return `Open until ${formatHour(day.closes_at)}`;

    return "Closed now";
}
