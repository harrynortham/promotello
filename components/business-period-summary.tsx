import type { ReactNode } from "react";
import {
    FiCheckCircle,
    FiEye,
    FiGrid,
    FiStar,
    FiTag,
    FiAward,
} from "react-icons/fi";

import { DailyBars } from "@/components/daily-bars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Metric = { current: number; previous: number };

export type BusinessAnalytics = {
    days: number;
    totals: Partial<
        Record<
            | "profile_views"
            | "offer_views"
            | "claims"
            | "used"
            | "qr_scans"
            | "loyalty_stamps"
            | "review_clicks"
            | "shared_views",
            Metric
        >
    >;
    daily: { day: string; views: number; claims: number; used: number }[];
};

const empty: Metric = { current: 0, previous: 0 };

function sum(...metrics: (Metric | undefined)[]): Metric {
    return metrics.reduce<Metric>(
        (total, metric) => ({
            current: total.current + (metric?.current ?? 0),
            previous: total.previous + (metric?.previous ?? 0),
        }),
        empty,
    );
}

function Change({ metric }: { metric: Metric }) {
    if (metric.previous === 0) {
        return metric.current > 0 ? (
            <span className="text-[#17233B]/55">New this period</span>
        ) : (
            <span className="text-[#17233B]/40">No activity yet</span>
        );
    }

    const percent = Math.round(((metric.current - metric.previous) / metric.previous) * 100);
    const arrow = percent > 0 ? "▲" : percent < 0 ? "▼" : "";

    return (
        <span className={percent > 0 ? "text-emerald-700" : percent < 0 ? "text-[#17233B]/60" : "text-[#17233B]/55"}>
            {arrow} {Math.abs(percent)}%{" "}
            <span className="text-[#17233B]/45">vs previous period</span>
        </span>
    );
}

function Tile({ icon, label, metric, hint }: { icon: ReactNode; label: string; metric: Metric; hint: string }) {
    return (
        <div role="group" aria-label={label} className="rounded-xl border border-[#17233B]/10 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[#17233B]/60">
                <span className="text-[#FF593F]">{icon}</span>
                {label}
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{metric.current.toLocaleString("en-GB")}</p>
            <p className="mt-1 text-xs"><Change metric={metric} /></p>
            <p className="mt-3 text-xs text-[#17233B]/50">{hint}</p>
        </div>
    );
}

export function PeriodSummary({ analytics }: { analytics: BusinessAnalytics }) {
    const { totals } = analytics;
    const views = sum(totals.profile_views, totals.offer_views);
    const claims = totals.claims ?? empty;
    const used = totals.used ?? empty;
    const conversion = views.current > 0 ? Math.round((claims.current / views.current) * 100) : null;

    return (
        <Card className="mt-10 border-[#17233B]/10">
            <CardHeader>
                <p className="text-sm font-medium text-[#FF593F]">Last {analytics.days} days</p>
                <CardTitle>What Promotello brought you</CardTitle>
                <p className="text-sm text-[#17233B]/60">
                    {used.current > 0
                        ? `${used.current} ${used.current === 1 ? "customer" : "customers"} came in and used a voucher.`
                        : "Once customers use their vouchers in store, you'll see them here."}
                    {conversion !== null && ` ${conversion}% of page views turned into a claim.`}
                </p>
            </CardHeader>

            <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Tile
                        icon={<FiEye />}
                        label="Page views"
                        metric={views}
                        hint={`Visits to your business and promotion pages, ${(totals.shared_views ?? empty).current} from shared links.`}
                    />
                    <Tile icon={<FiTag />} label="Vouchers claimed" metric={claims} hint="Customers who saved one of your promotions." />
                    <Tile icon={<FiCheckCircle />} label="Vouchers used" metric={used} hint="Claims your staff marked as used in store." />
                    <Tile icon={<FiGrid />} label="QR poster scans" metric={totals.qr_scans ?? empty} hint="Scans of your printed QR posters." />
                    <Tile icon={<FiAward />} label="Loyalty stamps" metric={totals.loyalty_stamps ?? empty} hint="Stamps given on digital loyalty cards." />
                    <Tile icon={<FiStar />} label="Google review clicks" metric={totals.review_clicks ?? empty} hint="Customers sent to leave you a review." />
                </div>

                <div className="mt-8">
                    <h3 className="text-sm font-semibold">Page views per day</h3>
                    <p className="mb-4 text-xs text-[#17233B]/55">Hover a day to see its claims and used vouchers.</p>
                    <DailyBars
                        data={analytics.daily.map((d) => ({
                            day: d.day,
                            value: d.views,
                            detail: `${d.claims} claims · ${d.used} used`,
                        }))}
                        unit="views"
                        emptyMessage="No page views yet. Share your business page or put up a QR poster to get started."
                    />
                </div>
            </CardContent>
        </Card>
    );
}
