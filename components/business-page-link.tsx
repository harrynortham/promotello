import Link from "next/link";
import { FiExternalLink } from "react-icons/fi";

import { businessPath } from "@/lib/slugs";
import { cn } from "@/lib/utils";

// The page customers see, a click away from wherever someone is working
// in the dashboard. A new tab, because the dashboard is where they were.
// A business still waiting for approval sees its own page as a preview,
// so the link is worth having before going live too.
export function BusinessPageLink({
    business,
    className,
}: {
    business: { name: string; slug: string };
    className?: string;
}) {
    return (
        <Link
            href={businessPath(business)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${business.name}'s page in a new tab`}
            className={cn(
                "shrink-0 rounded text-[#17233B]/55 transition hover:text-[#FF593F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]",
                className,
            )}
        >
            <FiExternalLink aria-hidden="true" className="size-4" />
        </Link>
    );
}
