import { FiClock } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/business-status";
import { cn } from "@/lib/utils";

// A business's approval status, wherever its team sees it. Pending is
// marked in warning colours with a clock, because it is a state the
// business is waiting on rather than a setting.
export function BusinessStatusBadge({
    status,
    reviewRequested = true,
    className = "",
}: {
    status: string;
    // Whether the business has asked us to look. Defaults to true so a
    // caller that doesn't know says the old thing rather than the wrong one.
    reviewRequested?: boolean;
    className?: string;
}) {
    // Waiting on us, rather than waiting on them.
    const isPending = status === "pending" && reviewRequested;

    return (
        <Badge
            variant="outline"
            className={cn(
                isPending && "border-amber-300 bg-amber-50 text-amber-800",
                className,
            )}
        >
            {isPending && <FiClock aria-hidden="true" />}
            {statusLabel(status, reviewRequested)}
        </Badge>
    );
}
