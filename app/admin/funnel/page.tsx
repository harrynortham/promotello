import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FiArrowRight, FiClock } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatGap, funnelRows, stuckByStep, type FunnelStep, type StuckBusiness } from "@/lib/funnel";
import { getCityOptions } from "@/lib/locations";
import { createClient } from "@/utils/supabase/server";

export const metadata = { title: "Onboarding funnel" };

type Funnel = {
    businesses: number;
    stuck_after_days: number;
    steps: FunnelStep[];
    signups_without_a_business: number;
    stuck: StuckBusiness[];
};

type PageProps = { searchParams: Promise<{ city?: string }> };

function Loading() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96 max-w-full" />
            <Skeleton className="h-96 rounded-2xl" />
        </div>
    );
}

function percent(value: number | null) {
    if (value === null) {
        return "—";
    }

    return `${Math.round(value * 100)}%`;
}

async function FunnelContent({ searchParams }: PageProps) {
    await connection();

    const { city } = await searchParams;
    const supabase = await createClient();

    // A business has no city until it has an address, and the ones that
    // never got that far are exactly who this page is for — so "no city
    // yet" is a choice rather than something the filter hides.
    const noCityOnly = city === "none";
    const cityId = city && city !== "none" && city !== "all" ? city : null;

    const [{ data, error }, cities] = await Promise.all([
        supabase.rpc("onboarding_funnel", {
            requested_city_id: cityId,
            only_without_city: noCityOnly,
        }),
        getCityOptions({ includeNotLive: true }),
    ]);

    if (error || !data) {
        return (
            <Alert variant="destructive">
                <AlertTitle>We couldn&apos;t load the funnel</AlertTitle>
                <AlertDescription>
                    {error?.message ?? "Please refresh the page and try again."}
                </AlertDescription>
            </Alert>
        );
    }

    const funnel = data as Funnel;
    const rows = funnelRows(funnel.steps);
    const stuck = stuckByStep(funnel.stuck);
    const filters = [
        { label: "Everywhere", value: "all" },
        ...cities.map((option) => ({ label: option.name, value: option.id })),
        { label: "No city yet", value: "none" },
    ];
    const chosen = city ?? "all";

    return (
        <div className="text-[#17233B]">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Onboarding funnel</h1>
                <p className="mt-2 max-w-2xl text-[#17233B]/65">
                    Where businesses stop, between the link we send them and paying us. Sample
                    businesses are left out. A step counted for more businesses than the one before
                    it means people arrived another way — somebody who signed up never opened a
                    preview.
                </p>
            </header>

            <nav aria-label="City" className="mt-6 flex flex-wrap gap-2">
                {filters.map((filter) => (
                    <Button
                        key={filter.value}
                        render={<Link href={`/admin/funnel?city=${filter.value}`} />}
                        nativeButton={false}
                        variant={chosen === filter.value ? "default" : "outline"}
                        size="sm"
                    >
                        {filter.label}
                    </Button>
                ))}
            </nav>

            <section aria-labelledby="steps-heading" className="mt-8">
                <h2 id="steps-heading" className="text-xl font-semibold">
                    {funnel.businesses} {funnel.businesses === 1 ? "business" : "businesses"}
                </h2>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-[#17233B]/10 bg-white">
                    <table className="w-full min-w-[40rem] text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#17233B]/10 text-[#17233B]/65">
                                <th className="px-4 py-3 font-medium">Step</th>
                                <th className="px-4 py-3 font-medium">Got there</th>
                                <th className="px-4 py-3 font-medium">Of the step before</th>
                                <th className="px-4 py-3 font-medium">Typically took</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.step} className="border-b border-[#17233B]/5 last:border-0">
                                    <td className="px-4 py-3 font-medium">
                                        {row.position}. {row.label}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">{row.reached}</td>
                                    <td className="px-4 py-3">
                                        <span className="tabular-nums">{percent(row.conversion)}</span>
                                        {row.lost > 0 && (
                                            <span className="ml-2 text-[#17233B]/55">
                                                {row.lost} stopped
                                            </span>
                                        )}
                                        {row.arrivedAnotherWay && (
                                            <span className="ml-2 text-[#17233B]/55">another way in</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-[#17233B]/70">
                                        {formatGap(row.median_seconds) ?? "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {funnel.signups_without_a_business > 0 && (
                    <p className="mt-3 text-sm text-[#17233B]/65">
                        {funnel.signups_without_a_business} started signing up and never made a
                        business at all, so they aren&apos;t in the table.
                    </p>
                )}
            </section>

            <section aria-labelledby="stuck-heading" className="mt-10">
                <h2 id="stuck-heading" className="text-xl font-semibold">
                    Stuck for more than {funnel.stuck_after_days} days
                </h2>
                <p className="mt-2 text-[#17233B]/65">
                    Where each one got to, and how long it has been sitting there. One business is
                    an email to send; five on the same step is something to fix.
                </p>

                {stuck.length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-dashed border-[#17233B]/15 bg-white px-5 py-6 text-[#17233B]/65">
                        Nobody is stuck. Either everyone is moving, or nobody has started.
                    </p>
                ) : (
                    <div className="mt-4 space-y-6">
                        {stuck.map((group) => (
                            <div key={group.step}>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#FF593F]">
                                    {group.label}
                                    <span className="ml-2 text-[#17233B]/55">
                                        {group.businesses.length}
                                    </span>
                                </h3>

                                <ul className="mt-3 divide-y divide-[#17233B]/5 rounded-2xl border border-[#17233B]/10 bg-white">
                                    {group.businesses.map((business) => (
                                        <li
                                            key={business.business_id}
                                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{business.name}</p>
                                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#17233B]/65">
                                                    <FiClock aria-hidden="true" />
                                                    {business.waiting_days}{" "}
                                                    {business.waiting_days === 1 ? "day" : "days"} here
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                <Badge variant="outline">{business.label}</Badge>
                                                <Button
                                                    render={
                                                        <Link href={`/admin/funnel/${business.business_id}`} />
                                                    }
                                                    nativeButton={false}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    Timeline
                                                    <FiArrowRight aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default function FunnelPage(props: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <FunnelContent {...props} />
        </Suspense>
    );
}
