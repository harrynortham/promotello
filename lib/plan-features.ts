import { FREE_LIVE_OFFER_LIMIT, type PlanTier } from "@/lib/billing";

// true / false, or a short value such as "1" or "Unlimited".
export type Availability = boolean | string;

type ComparisonRow = Record<PlanTier, Availability> & {
    feature: string;
    // How the feature reads in a plan's "plus" list, when the plan adds it.
    plus?: string;
};

// What each plan includes. The features page and the billing page both show
// this, so it's the one place to change when a plan changes.
export const planComparison: ComparisonRow[] = [
    { feature: "Business page in the Promotello directory", free: true, pro: true, growth: true },
    { feature: "Live offers", free: String(FREE_LIVE_OFFER_LIMIT), pro: "Unlimited", growth: "Unlimited", plus: "Unlimited live offers" },
    { feature: "Offers live without waiting for review", free: false, pro: true, growth: true },
    { feature: "Scan-to-redeem vouchers", free: true, pro: true, growth: true },
    { feature: "QR posters with scan counts", free: "1", pro: "Unlimited", growth: "Unlimited", plus: "A QR poster for every spot, with scans compared" },
    { feature: "Team members for your staff", free: true, pro: true, growth: true },
    { feature: "Digital loyalty card", free: false, pro: true, growth: true, plus: "A digital loyalty card, stamped by your staff" },
    { feature: "Followers emailed every new offer", free: false, pro: true, growth: true },
    { feature: "Google review prompts", free: false, pro: true, growth: true, plus: "Google review prompts after a visit" },
    { feature: "Share links, Instagram images and captions", free: true, pro: true, growth: true },
    { feature: "30-day analytics", free: true, pro: true, growth: true },
    { feature: "Welcome, birthday and win-back automations", free: false, pro: false, growth: true, plus: "Welcome, birthday and win-back emails that run themselves" },
    { feature: "Quiet-hours offers", free: false, pro: false, growth: true, plus: "Quiet-hours offers that repeat on the days and times you choose" },
    { feature: "Monthly value report by email", free: false, pro: false, growth: true, plus: "A monthly value report in your inbox" },
];

// What a plan adds over the one below it.
export function planAdds(tier: "pro" | "growth") {
    const below: PlanTier = tier === "growth" ? "pro" : "free";
    return planComparison
        .filter((row) => row[tier] !== false && row[tier] !== row[below])
        .map((row) => row.plus ?? row.feature);
}
