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
