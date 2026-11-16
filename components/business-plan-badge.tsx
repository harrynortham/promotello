import { Badge } from "@/components/ui/badge";
import { plans, type PlanTier } from "@/lib/billing";
import { cn } from "@/lib/utils";

// Which plan this business is on, beside its approval status in the
// dashboard sidebar.
//
// Nothing is shown on Free. A badge saying "Free" would label the
// majority of businesses with the one thing they have not done, every
// time they open the dashboard — and the places that do ask them to
// think about it already exist and pick their moment. This is here for
// the opposite reason: somebody paying should be able to see what they
// are paying for without opening Billing.

export function BusinessPlanBadge({
    tier,
    trialing = false,
    className = "",
}: {
    tier: PlanTier;
    // Still in the free trial, which is worth naming: the clock is
    // running and the plan stops at the end of it unless a card is
    // added.
    trialing?: boolean;
    className?: string;
}) {
    if (tier === "free") return null;

    const name = tier === "growth" ? plans.growth_monthly.name : plans.pro_monthly.name;

    return (
        <Badge
            variant="outline"
            className={cn("border-[#FF593F]/40 bg-[#FF593F]/5 text-[#FF593F]", className)}
        >
            {trialing ? `${name} · Trial` : name}
        </Badge>
    );
}
