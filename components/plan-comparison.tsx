import { FiCheck, FiMinus } from "react-icons/fi";

import type { PlanTier } from "@/lib/billing";
import { planComparison, type Availability } from "@/lib/plan-features";

const columns: { tier: PlanTier; name: string }[] = [
    { tier: "free", name: "Free" },
    { tier: "pro", name: "Pro" },
    { tier: "growth", name: "Growth" },
];

function Cell({ value }: { value: Availability }) {
    if (value === true) {
        return <FiCheck aria-label="Included" className="mx-auto text-[#FF593F]" />;
    }

    if (value === false) {
        return <FiMinus aria-label="Not included" className="mx-auto text-[#17233B]/25" />;
    }

    return <span className="text-xs font-medium sm:text-sm">{value === "Unlimited" ? "No limit" : value}</span>;
}

// Free, Pro and Growth side by side. `highlight` tints one column; `current`
// marks the business's own plan.
export function PlanComparison({ highlight = "pro", current }: { highlight?: PlanTier; current?: PlanTier }) {
    return (
        <table className="w-full text-left">
            <thead>
                <tr className="border-b border-[#17233B]/10 text-sm">
                    <th className="px-3 py-4 text-sm font-medium text-[#17233B]/70 sm:px-5">Feature</th>
                    {columns.map(({ tier, name }) => (
                        <th
                            key={tier}
                            className={`w-16 px-1 py-4 text-center align-bottom font-semibold sm:w-24 sm:px-5 ${tier === highlight ? "text-[#FF593F]" : ""}`}
                        >
                            {current === tier && (
                                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[#17233B]/60 sm:text-xs">
                                    Your plan
                                </span>
                            )}
                            {name}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {planComparison.map((row) => (
                    <tr key={row.feature} className="border-b border-[#17233B]/5 last:border-0">
                        <td className="px-3 py-3 text-sm sm:px-5">{row.feature}</td>
                        {columns.map(({ tier }) => (
                            <td
                                key={tier}
                                className={`px-1 py-3 text-center sm:px-5 ${tier === highlight ? "bg-[#FF593F]/[0.04]" : ""}`}
                            >
                                <Cell value={row[tier]} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
