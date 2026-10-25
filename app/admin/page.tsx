import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import {
    FiAlertTriangle,
    FiArrowRight,
    FiBriefcase,
    FiCheckCircle,
    FiGift,
} from "react-icons/fi";

import { DailyBars } from "@/components/daily-bars";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlanPriceIds, type PlanKey } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";

type Change = { current: number; previous: number };

type PlatformMetrics = {
    generated_at: string;
    businesses: { approved: number; pending: number; new: number; new_previous: number };
    pending_offers: number;
    open_billing_alerts: number;
    subscriptions: {
        trialing: number;
        active: number;
        past_due: number;
        paying_price_ids: (string | null)[];
        canceled: number;
    };
    weekly_active: { paid_active: number; paid_total: number; all_active: number };
    customers: {
        accounts: number;
        new: number;
        new_previous: number;
        followers: number;
        loyalty_holders: number;
        visitors: number;
        repeat_visitors: number;
        cross_visitors: number;
    };
    activity: Partial<
        Record<"claims" | "used" | "stamps" | "qr_scans" | "page_views" | "review_clicks" | "follows", Change>
    >;
    daily: { day: string; signups: number; claims: number; visits: number }[];
    top_businesses: { id: string; name: string; visits: number; claims: number; views: number; pro: boolean }[];
};

// Monthly value of each plan in pounds; yearly is spread over 12 months.
const monthlyValue: Record<PlanKey, number> = {
    pro_founding_monthly: 19,
    pro_monthly: 24,
    pro_yearly: 20,
    growth_monthly: 39,
    growth_yearly: 32.5,
};

// Targets from the roadmap (end of Phase 2).
const targets = { weeklyActive: 70, repeatRate: 35, crossVisits: 15, churn: 5 };

const pounds = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

function percent(part: number, whole: number) {
    return whole > 0 ? Math.round((part / whole) * 100) : null;
}

async function monthlyRecurringRevenue(priceIds: (string | null)[]) {
    if (priceIds.length === 0) return 0;

    try {
        const planByPrice = Object.fromEntries(
            Object.entries(await getPlanPriceIds()).map(([plan, priceId]) => [priceId, plan as PlanKey]),
        );

        return priceIds.reduce((total, priceId) => {
            const plan = priceId ? planByPrice[priceId] : undefined;
            return total + (plan ? monthlyValue[plan] : monthlyValue.pro_monthly);
        }, 0);
    } catch {
        return null;
    }
}

function ChangeLabel({ metric }: { metric: Change }) {
    if (metric.previous === 0) {
        return <span className="text-[#17233B]/65">{metric.current > 0 ? "New this period" : "None yet"}</span>;
    }

    const change = Math.round(((metric.current - metric.previous) / metric.previous) * 100);

    return (
        <span className={change > 0 ? "text-emerald-700" : "text-[#17233B]/70"}>
            {change > 0 ? "▲" : change < 0 ? "▼" : ""} {Math.abs(change)}%{" "}
            <span className="text-[#17233B]/65">vs previous 30 days</span>
        </span>
    );
}

// "4 signed up in 30 days (2 before)": new sign-ups, which may not be live yet.
function SignupsLabel({ current, previous, noun }: { current: number; previous: number; noun: string }) {
    return (
        <span>
            {current} {noun} in 30 days
            <span className="text-[#17233B]/65"> · {previous} the 30 days before</span>
        </span>
    );
}

function Stat({
    label,
    value,
    children,
}: {
    label: string;
    value: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div role="group" aria-label={label} className="rounded-xl border border-[#17233B]/10 bg-white p-5">
            <p className="text-sm font-medium text-[#17233B]/70">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
            {children && <div className="mt-1 text-xs text-[#17233B]/70">{children}</div>}
        </div>
    );
}

function RateTarget({ label, rate, target, detail }: { label: string; rate: number | null; target: number; detail: string }) {
    return (
        <div role="group" aria-label={label} className="rounded-xl border border-[#17233B]/10 bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-[#17233B]/70">{label}</p>
                <p className="text-xs text-[#17233B]/65">Target {target}%</p>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{rate === null ? "–" : `${rate}%`}</p>
            <Progress value={Math.min(rate ?? 0, 100)} className="mt-3 h-1.5" />
            <p className="mt-2 text-xs text-[#17233B]/70">{detail}</p>
        </div>
    );
}

function AttentionLink({ href, icon, count, label }: { href: string; icon: ReactNode; count: number; label: string }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-4 rounded-xl border border-[#17233B]/10 bg-white p-4 transition-colors hover:border-[#FF593F]/40"
        >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${count > 0 ? "bg-[#FF593F]/10 text-[#FF593F]" : "bg-[#17233B]/5 text-[#17233B]/65"}`}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-2xl font-semibold tabular-nums">{count}</span>
                <span className="block text-sm text-[#17233B]/70">{label}</span>
            </span>
            <FiArrowRight aria-hidden="true" className="text-[#17233B]/30 transition-colors group-hover:text-[#FF593F]" />
        </Link>
    );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="mt-10">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-[#17233B]/70">{description}</p>}
            <div className="mt-4">{children}</div>
        </section>
    );
}

function OverviewLoading() {
    return (
        <div role="status" aria-label="Loading overview" className="space-y-6">
            <Skeleton className="h-9 w-48" />
            <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-24 rounded-xl" />
                ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-28 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
        </div>
    );
}

async function OverviewContent() {
    await connection();

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("platform_metrics");

    if (error || !data) {
        return (
            <Alert variant="destructive">
                <AlertTitle>We couldn&apos;t load the overview</AlertTitle>
                <AlertDescription>Please refresh the page and try again.</AlertDescription>
            </Alert>
        );
    }

    const metrics = data as PlatformMetrics;
    const { businesses, subscriptions, weekly_active: weekly, customers, activity } = metrics;
    const paying = subscriptions.active + subscriptions.past_due;
    const mrr = await monthlyRecurringRevenue(subscriptions.paying_price_ids);
    const churn = percent(subscriptions.canceled, paying + subscriptions.canceled);
    const needsAttention = businesses.pending + metrics.pending_offers + metrics.open_billing_alerts;
    const empty: Change = { current: 0, previous: 0 };

    return (
        <div>
            <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Overview</h1>
                    <p className="mt-2 text-[#17233B]/65">
                        How Promotello is doing. Activity covers the last 30 days; sample businesses are left out.
                    </p>
                </div>
                <p className="text-xs text-[#17233B]/65">
                    Updated{" "}
                    {new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Europe/London" }).format(
                        new Date(metrics.generated_at),
                    )}
                </p>
            </header>

            <Section title="Needs attention">
                {needsAttention === 0 ? (
                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                        <FiCheckCircle aria-hidden="true" />
                        <AlertTitle>All caught up</AlertTitle>
                        <AlertDescription>No businesses, promotions or billing alerts are waiting.</AlertDescription>
                    </Alert>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                        <AttentionLink href="/admin/businesses" icon={<FiBriefcase />} count={businesses.pending} label="Businesses to review" />
                        <AttentionLink href="/admin/offers" icon={<FiGift />} count={metrics.pending_offers} label="Promotions to review" />
                        <AttentionLink href="/admin/billing" icon={<FiAlertTriangle />} count={metrics.open_billing_alerts} label="Billing alerts" />
                    </div>
                )}
            </Section>

            <Section title="Revenue" description="Paying means active or past due; trials aren't counted until they pay.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Monthly recurring revenue" value={mrr === null ? "–" : pounds.format(mrr)}>
                        {mrr === null ? "Couldn't reach Stripe for prices" : "Yearly plans counted per month"}
                    </Stat>
                    <Stat label="Paying businesses" value={paying}>
                        {subscriptions.past_due > 0 ? `${subscriptions.past_due} past due` : "None past due"}
                    </Stat>
                    <Stat label="On free trial" value={subscriptions.trialing} />
                    <Stat label="Cancelled" value={subscriptions.canceled}>
                        {churn === null ? "Last 30 days" : `${churn}% churn · target under ${targets.churn}%`}
                    </Stat>
                </div>
            </Section>

            <Section
                title="Engagement"
                description="A business is active when it stamps a card or a voucher is used there."
            >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <RateTarget
                        label="Weekly active businesses"
                        rate={percent(weekly.paid_active, weekly.paid_total)}
                        target={targets.weeklyActive}
                        detail={`${weekly.paid_active} of ${weekly.paid_total} on Pro or trial this week · ${weekly.all_active} active overall`}
                    />
                    <RateTarget
                        label="Repeat visit rate"
                        rate={percent(customers.repeat_visitors, customers.visitors)}
                        target={targets.repeatRate}
                        detail={`${customers.repeat_visitors} of ${customers.visitors} visiting customers came back`}
                    />
                    <RateTarget
                        label="Cross-visits"
                        rate={percent(customers.cross_visitors, customers.visitors)}
                        target={targets.crossVisits}
                        detail={`${customers.cross_visitors} customers visited 2+ businesses`}
                    />
                </div>
            </Section>

            <Section title="Businesses and customers">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Live businesses" value={businesses.approved}>
                        <SignupsLabel current={businesses.new} previous={businesses.new_previous} noun="signed up" />
                    </Stat>
                    <Stat label="Accounts" value={customers.accounts}>
                        <SignupsLabel current={customers.new} previous={customers.new_previous} noun="joined" />
                    </Stat>
                    <Stat label="Following a business" value={customers.followers} />
                    <Stat label="Holding a loyalty card" value={customers.loyalty_holders} />
                </div>
            </Section>

            <Section title="Activity" description="Last 30 days compared with the 30 days before.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Page views" value={(activity.page_views ?? empty).current}>
                        <ChangeLabel metric={activity.page_views ?? empty} />
                    </Stat>
                    <Stat label="Vouchers claimed" value={(activity.claims ?? empty).current}>
                        <ChangeLabel metric={activity.claims ?? empty} />
                    </Stat>
                    <Stat label="Vouchers used" value={(activity.used ?? empty).current}>
                        <ChangeLabel metric={activity.used ?? empty} />
                    </Stat>
                    <Stat label="Loyalty stamps" value={(activity.stamps ?? empty).current}>
                        <ChangeLabel metric={activity.stamps ?? empty} />
                    </Stat>
                    <Stat label="QR poster scans" value={(activity.qr_scans ?? empty).current}>
                        <ChangeLabel metric={activity.qr_scans ?? empty} />
                    </Stat>
                    <Stat label="New follows" value={(activity.follows ?? empty).current}>
                        <ChangeLabel metric={activity.follows ?? empty} />
                    </Stat>
                    <Stat label="Review clicks" value={(activity.review_clicks ?? empty).current}>
                        <ChangeLabel metric={activity.review_clicks ?? empty} />
                    </Stat>
                </div>

                <Card className="mt-4 border-[#17233B]/10 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base">Customer visits per day</CardTitle>
                        <p className="text-xs text-[#17233B]/70">
                            Vouchers used plus loyalty stamps. Hover a day for claims and sign-ups.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <DailyBars
                            data={metrics.daily.map((d) => ({
                                day: d.day,
                                value: d.visits,
                                detail: `${d.claims} claims · ${d.signups} sign-ups`,
                            }))}
                            unit="visits"
                            emptyMessage="No customer visits in the last 30 days yet."
                        />
                    </CardContent>
                </Card>
            </Section>

            <Section title="Most active businesses" description="Ranked by customer visits in the last 30 days.">
                {metrics.top_businesses.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#17233B]/15 bg-white px-4 py-8 text-center text-sm text-[#17233B]/70">
                        No business activity in the last 30 days yet.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#17233B]/10 bg-white">
                        <table className="w-full min-w-[32rem] text-left text-sm">
                            <thead className="text-[#17233B]/70">
                                <tr className="border-b border-[#17233B]/10">
                                    <th className="px-4 py-3 font-medium">Business</th>
                                    <th className="px-4 py-3 text-right font-medium">Visits</th>
                                    <th className="px-4 py-3 text-right font-medium">Claims</th>
                                    <th className="px-4 py-3 text-right font-medium">Page views</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.top_businesses.map((business) => (
                                    <tr key={business.id} className="border-b border-[#17233B]/5 last:border-0">
                                        <td className="px-4 py-3">
                                            <Link href={`/businesses/${business.id}`} className="font-medium hover:text-[#FF593F]">
                                                {business.name}
                                            </Link>
                                            {business.pro && (
                                                <Badge variant="outline" className="ml-2 border-[#FF593F]/30 text-[#C2341F]">
                                                    Pro
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">{business.visits}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{business.claims}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{business.views}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>
        </div>
    );
}

export default function AdminOverviewPage() {
    return (
        <Suspense fallback={<OverviewLoading />}>
            <OverviewContent />
        </Suspense>
    );
}
