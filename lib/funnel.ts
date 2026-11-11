// The journey a business makes, from an outreach link to paying us, as
// plain data so the admin page can be read and tested without a database.
//
// This list is the vocabulary: the same seventeen names are the check
// constraint on onboarding_events.step and the ordering inside
// onboarding_funnel(). Changing one means changing both.

export const FUNNEL_STEPS = [
    { id: "preview_opened", label: "Preview opened", note: "We emailed them a page" },
    { id: "signup_started", label: "Sign-up started", note: "Claim or Get started pressed" },
    { id: "account_created", label: "Account created" },
    { id: "business_created", label: "Business created" },
    { id: "logo_added", label: "Logo added" },
    { id: "description_added", label: "Description added" },
    { id: "address_added", label: "Address added" },
    { id: "hours_added", label: "Hours added" },
    { id: "cover_added", label: "Cover photo added" },
    { id: "sent_for_review", label: "Sent for review" },
    { id: "approved", label: "Approved" },
    { id: "first_offer_published", label: "First offer live" },
    { id: "qr_poster_created", label: "QR poster made" },
    { id: "qr_poster_downloaded", label: "QR poster printed" },
    { id: "first_qr_scan", label: "First real scan", note: "An hour after the code was made" },
    { id: "first_customer_action", label: "First customer" },
    { id: "upgraded_to_paid", label: "Paying" },
] as const;

export type FunnelStepId = (typeof FUNNEL_STEPS)[number]["id"];

export type FunnelStep = {
    step: string;
    label: string;
    position: number;
    reached: number;
    median_seconds: number | null;
};

export type FunnelRow = FunnelStep & {
    // Of the businesses that reached the step before this one. Null for the
    // first step, and for a step whose predecessor nobody reached.
    conversion: number | null;
    // How many didn't get here from there. Negative when more arrived than
    // came through the step before — see `arrivedAnotherWay`.
    lost: number;
    // Somebody who signed up without a preview never opened one, so a step
    // can be reached by more businesses than the step before it. That is
    // worth saying out loud rather than hiding behind a tidy percentage.
    arrivedAnotherWay: boolean;
};

export function funnelRows(steps: FunnelStep[]): FunnelRow[] {
    const ordered = [...steps].sort((a, b) => a.position - b.position);

    return ordered.map((step, index) => {
        const before = index === 0 ? null : ordered[index - 1];
        const conversion = before && before.reached > 0 ? step.reached / before.reached : null;

        return {
            ...step,
            conversion,
            lost: before ? before.reached - step.reached : 0,
            arrivedAnotherWay: Boolean(before && step.reached > before.reached),
        };
    });
}

export function isFunnelStepId(value: string | null | undefined): value is FunnelStepId {
    return FUNNEL_STEPS.some((step) => step.id === value);
}

export function stepLabel(id: string) {
    return FUNNEL_STEPS.find((step) => step.id === id)?.label ?? id;
}

// A gap between two steps, in the biggest unit that still says something.
// "4 days" is a report; "4 days, 3 hours and 11 minutes" is a stopwatch.
export function formatGap(seconds: number | null | undefined) {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
        return null;
    }

    const rounded = Math.max(0, Math.round(seconds));

    if (rounded < 90) {
        return "under 2 minutes";
    }

    const units: [number, string][] = [
        [86_400, "day"],
        [3_600, "hour"],
        [60, "minute"],
    ];

    for (const [size, name] of units) {
        if (rounded >= size) {
            const count = Math.round(rounded / size);
            return `${count} ${name}${count === 1 ? "" : "s"}`;
        }
    }

    return "under 2 minutes";
}

export type StuckBusiness = {
    business_id: string;
    name: string;
    slug: string | null;
    step: string;
    label: string;
    // When the clock started: the moment they reached this step, or — if
    // that step's time was backfilled rather than recorded — the last step
    // we actually watched happen. See onboarding_funnel().
    at: string;
    waiting_days: number;
};

// The stuck list, gathered by the step people are stuck on: one business
// waiting is a nudge to send, five on the same step is something to fix.
export function stuckByStep(stuck: StuckBusiness[]) {
    const order = new Map<string, number>(FUNNEL_STEPS.map((step, index) => [step.id, index]));
    const groups = new Map<string, StuckBusiness[]>();

    for (const business of stuck) {
        groups.set(business.step, [...(groups.get(business.step) ?? []), business]);
    }

    return [...groups.entries()]
        .map(([step, businesses]) => ({
            step,
            label: stepLabel(step),
            businesses: [...businesses].sort((a, b) => b.waiting_days - a.waiting_days),
        }))
        .sort((a, b) => (order.get(a.step) ?? 99) - (order.get(b.step) ?? 99));
}
