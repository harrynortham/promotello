// What the repeat-visit numbers say out loud.
//
// business_repeat_visits() counts the people
// (20261229090000_the_number_nobody_else_can_print.sql); this turns
// them into the sentence a business reads on its analytics page and in
// its monthly email, so both say it the same way.
//
// Imports nothing, so it unit tests on its own
// (tests/unit/repeat-visits.test.ts).

export type RepeatVisits = {
    months: number;
    // Everybody whose first visit landed in the window.
    newCustomers: number;
    returned: number;
    regulars: number;
    // And the same three for the ones Promotello sent, which is what
    // the sentence is about: 12 of the 41 we sent, not 12 of everybody
    // who happened to walk in.
    sentByPromotello: number;
    sentReturned: number;
    sentRegulars: number;
    customers: number;
    visits: number;
    byMonth: { month: string; newCustomers: number; sent: number; returned: number }[];
};

// The people the sentence is about: the ones we sent, where we sent
// any, and otherwise everybody who came in for the first time.
export function cohort(report: RepeatVisits) {
    return report.sentByPromotello > 0
        ? { total: report.sentByPromotello, returned: report.sentReturned, regulars: report.sentRegulars, sent: true }
        : { total: report.newCustomers, returned: report.returned, regulars: report.regulars, sent: false };
}

// The shape the database hands back, which is snake_case and partly
// unknown: a report that fails to load must not take a page with it.
export function readRepeatVisits(data: unknown): RepeatVisits | null {
    if (!data || typeof data !== "object") return null;

    const row = data as Record<string, unknown>;
    const count = (key: string) => (typeof row[key] === "number" ? (row[key] as number) : 0);

    if (typeof row.months !== "number") return null;

    const byMonth = Array.isArray(row.by_month) ? (row.by_month as Record<string, unknown>[]) : [];

    return {
        months: row.months,
        newCustomers: count("new_customers"),
        returned: count("returned"),
        regulars: count("regulars"),
        sentByPromotello: count("sent_by_promotello"),
        sentReturned: count("sent_returned"),
        sentRegulars: count("sent_regulars"),
        customers: count("customers"),
        visits: count("visits"),
        byMonth: byMonth.map((month) => ({
            month: String(month.month ?? ""),
            newCustomers: Number(month.new_customers ?? 0),
            sent: Number(month.sent ?? 0),
            returned: Number(month.returned ?? 0),
        })),
    };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// How many of them came back, as a percentage of the people the
// sentence is about. Nobody at all is not nought per cent, it is
// nothing to say.
export function returnRate(report: RepeatVisits): number | null {
    const these = cohort(report);

    if (these.total === 0) return null;

    return Math.round((these.returned / these.total) * 100);
}

export function monthsLabel(months: number) {
    if (months === 1) return "this month";
    if (months === 12) return "this year";
    if (months % 12 === 0) return `the last ${months / 12} years`;

    return `the last ${months} months`;
}

// The claim, in the business's words rather than ours. Said only as far
// as the numbers go: no first-timers means no sentence about them.
export function repeatVisitSentence(report: RepeatVisits): string {
    const when = monthsLabel(report.months);
    const these = cohort(report);

    if (these.total === 0) {
        return `Nobody's first visit landed in ${when}. This counts customers whose very first visit to you was in that time.`;
    }

    const first = these.sent
        ? `Promotello sent you ${plural(these.total, "first-time customer", "first-time customers")} in ${when}`
        : `${plural(these.total, "customer came", "customers came")} in for the first time in ${when}`;

    const back = these.returned > 0
        ? `${these.returned} came back`
        : "None of them has been back yet";

    const regulars = these.regulars > 0
        ? `${these.regulars} ${these.regulars === 1 ? "is now a regular" : "are now regulars"}`
        : null;

    return [`${first}.`, `${back}.`, regulars ? `${regulars}.` : null].filter(Boolean).join(" ");
}
