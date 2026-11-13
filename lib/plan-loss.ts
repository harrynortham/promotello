import type { PlanTier } from "@/lib/billing";

// What ending a plan actually costs, in the business's own numbers.
//
// Every line here was checked against the code that enforces it, because
// a warning that overstates is worth less than none: the first time a
// business finds out we exaggerated, nothing else we say counts.
//
//  - offers      apply_business_plan() pauses all but the newest live one
//  - the card    enforce_loyalty_plan() only gates starting or reopening
//                a programme. One already running keeps being stamped,
//                deliberately, so customers never lose stamps they
//                collected (20261025100000_loyalty_cards.sql)
//  - posters     enforce_qr_plan_limit() fires on insert and update, so
//                the ones already in windows keep scanning
//  - followers   business_has_pro() gates the new-offer email
//  - prompts     business_has_pro() gates Google review prompts
//  - Growth      automations, quiet hours at the counter, the monthly
//                report and the repeat-visit report
//
// So the honest argument is not "your card dies". It is that the card
// you have is the last one you will ever be able to start, your offers
// go dark but for one, and the people following you stop hearing from
// you.

export type Standing = {
    // Free can't cancel, so the tier here is always a paying one.
    tier: Exclude<PlanTier, "free">;
    // Approved, unexpired, unpaused: what a customer can see today.
    liveOffers: number;
    // In windows, not archived.
    posters: number;
    followers: number;
    // People holding a card right now.
    cardHolders: number;
    hasCard: boolean;
    automationsOn: number;
};

export type Consequence = { heading: string; body: string };

const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;

export function whatStops(standing: Standing): Consequence[] {
    const stops: Consequence[] = [];

    if (standing.liveOffers > 1) {
        const paused = standing.liveOffers - 1;

        stops.push({
            heading: `${plural(paused, "offer comes", "offers come")} off the directory`,
            body: `Free keeps your newest offer live and pauses the rest. Paused means nobody can find or claim them, and a poster pointing at one tells whoever scans it that it has stopped. They come back the moment you do.`,
        });
    }

    if (standing.hasCard) {
        stops.push({
            heading: "This is the last stamp card you can start",
            body:
                standing.cardHolders > 0
                    ? `The card ${plural(standing.cardHolders, "person is", "people are")} collecting on carries on — nobody loses a stamp. But starting a new card, or reopening one you have closed, is part of Pro. Close this one on Free and that is the end of it.`
                    : "The card you are running carries on. But starting another, or reopening one you have closed, is part of Pro — so on Free this is the only one you will ever have.",
        });
    }

    if (standing.followers > 0) {
        stops.push({
            heading: `${plural(standing.followers, "follower stops", "followers stop")} hearing from you`,
            body: "Every offer you publish is emailed to the people following you. On Free it isn't — they only find out if they happen to look.",
        });
    }

    if (standing.posters > 0) {
        stops.push({
            heading: "No more posters",
            body: `The ${plural(standing.posters, "poster", "posters")} already up keep working, and keep counting scans. Free includes one, so you can't make another for a new spot, a new offer or a window you haven't covered yet.`,
        });
    }

    stops.push({
        heading: "Google review prompts stop",
        body: "After a visit we ask the customer to leave you a review, at the one moment they are most likely to. That stops.",
    });

    if (standing.tier === "growth") {
        stops.push({
            heading:
                standing.automationsOn > 0
                    ? `${plural(standing.automationsOn, "automation", "automations")} switch off`
                    : "Automations switch off",
            body: "Welcome, birthday and win-back emails stop going out. The win-back one is the email that fetches somebody who has not been in for a while — the customers you are most likely to lose.",
        });

        stops.push({
            heading: "Quiet hours stop being enforced",
            body: "An offer set for weekday afternoons will mark as used on a Saturday lunchtime, and it is your staff who have to be the ones saying no.",
        });

        stops.push({
            heading: "You stop being told whether any of it worked",
            body: "The monthly report, and the number no loyalty app can print: first-time customers we sent you, how many came back, how many turned into regulars. Both are Growth.",
        });
    }

    return stops;
}

// Said plainly beside the losses, because overstating is how a warning
// stops being believed.
export function whatSurvives(standing: Standing): Consequence[] {
    const survives: Consequence[] = [
        {
            heading: "Your page stays up",
            body: "Your listing, your photos, your hours and one live offer. You are still in the directory, your city and your category.",
        },
    ];

    if (standing.hasCard) {
        survives.push({
            heading: "The stamp card keeps collecting",
            body: "Your staff keep stamping, nobody loses what they have collected, and the posters pointing at it keep working.",
        });
    }

    survives.push({
        heading: "Nothing is deleted",
        body: "Come back and the paused offers go live again, the automations pick up where they left off, and your numbers are all still there.",
    });

    return survives;
}

// The line at the top of the page: what they would be walking away from,
// rather than what they would lose.
export function worthKeeping(standing: Standing) {
    const parts: string[] = [];

    if (standing.cardHolders > 0) {
        parts.push(`${plural(standing.cardHolders, "person is", "people are")} collecting stamps with you`);
    }

    if (standing.followers > 0) {
        parts.push(`${plural(standing.followers, "person follows", "people follow")} you for new offers`);
    }

    if (standing.liveOffers > 0) {
        parts.push(`${plural(standing.liveOffers, "offer is", "offers are")} live`);
    }

    if (parts.length === 0) {
        return null;
    }

    if (parts.length === 1) {
        return `${parts[0]}.`;
    }

    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`;
}

// ---------------------------------------------------------------------------
// When a plan is actually ending
// ---------------------------------------------------------------------------

type SubscriptionState = {
    status: string;
    cancel_at_period_end: boolean;
};

const PAYING = ["trialing", "active", "past_due"];

// Is this event somebody ending their plan, rather than renewing it,
// changing it, or fixing a card? Pure, so tests/unit/plan-loss.test.ts
// can walk through a year of a subscription's life.
export function cancellationLanded(
    before: SubscriptionState | null,
    after: SubscriptionState,
): boolean {
    // Told to stop at the end of the period — the portal's cancel.
    if (after.cancel_at_period_end && !before?.cancel_at_period_end) {
        return true;
    }

    // Or it has already stopped: the period ran out, or a refund or a
    // dispute ended it there and then.
    if (!PAYING.includes(after.status) && (before === null || PAYING.includes(before.status))) {
        return true;
    }

    return false;
}

// They came back, or they never left: the next time they do leave, they
// should be told again.
export function cameBack(after: SubscriptionState): boolean {
    return PAYING.includes(after.status) && !after.cancel_at_period_end;
}
