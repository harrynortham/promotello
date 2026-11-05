import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";

import { BusinessStatusBadge } from "@/components/business-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { businessPath } from "@/lib/slugs";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

// One business, everything we know about it: who they are, what they're
// paying, and every email we have sent them.
//
// Read with the service key rather than the reader's own, because an
// admin has no row-level access to another business's subscription or
// email history. The check above it is this page's own, not the layout's:
// a page that reads with the service key should say who it lets in.

type PageProps = { params: Promise<{ businessId: string }> };

const emailNames: Record<string, string> = {
    welcome: "Welcome",
    setup_nudge_1: "Setup nudge",
    setup_nudge_2: "Second setup nudge",
    loyalty_pitch: "Loyalty card pitch",
    founding_places: "Founding places",
    results: "First two weeks",
    check_in: "Personal check-in",
    trial_ending: "Trial ending",
    daily_summary: "Daily summary",
};

const tierNames: Record<string, string> = { pro: "Pro", growth: "Growth" };

// Stripe's own words, which read oddly in a sentence.
const statusNames: Record<string, string> = {
    trialing: "On trial",
    active: "Paying",
    past_due: "Payment failed",
    canceled: "Cancelled",
    unpaid: "Unpaid",
    incomplete: "Never completed",
    incomplete_expired: "Never completed",
    paused: "Paused",
};

function when(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
    return (
        <dl className="space-y-3 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-3">
                    <dt className="text-[#17233B]/65">{label}</dt>
                    <dd className="text-right font-medium">
                        {value === null || value === undefined || value === "" ? "—" : value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

async function Overview({ params }: PageProps) {
    await connection();

    const { businessId } = await params;

    const reader = await createClient();
    const { data: isAdmin } = await reader.rpc("is_platform_admin");

    if (!isAdmin) {
        redirect("/dashboard");
    }

    const admin = createAdminClient();

    const [business, subscription, lifecycle, summaries, managers, offers, redemptions, followers, views] =
        await Promise.all([
            admin
                .from("businesses")
                .select("id, name, slug, category, description, website_url, contact_email, approval_status, created_at, is_sample, business_locations ( address_line_1, city, region, postal_code )")
                .eq("id", businessId)
                .maybeSingle(),
            admin
                .from("subscriptions")
                .select("tier, status, price_id, trial_end, created_at, stripe_customer_id")
                .eq("business_id", businessId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            admin
                .from("business_lifecycle_sends")
                .select("kind, sent_at")
                .eq("business_id", businessId)
                .order("sent_at", { ascending: false }),
            admin
                .from("business_notification_deliveries")
                .select("notification_type, delivery_date, recipient_email")
                .eq("business_id", businessId)
                .order("delivery_date", { ascending: false })
                .limit(20),
            admin.rpc("business_manager_emails", { requested_business_id: businessId }),
            admin.from("offers").select("id, approval_status", { count: "exact" }).eq("business_id", businessId),
            admin.from("offer_redemptions").select("id, offers!inner ( business_id )", { count: "exact", head: true }).eq("offers.business_id", businessId),
            admin.from("business_followers").select("user_id", { count: "exact", head: true }).eq("business_id", businessId),
            admin.from("page_views").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        ]);

    if (!business.data) {
        notFound();
    }

    const row = business.data;
    const location = Array.isArray(row.business_locations) ? row.business_locations[0] : row.business_locations;
    const live = (offers.data ?? []).filter((offer) => offer.approval_status === "approved").length;

    // Every email we have sent, newest first, whatever sent it.
    const history = [
        ...(lifecycle.data ?? []).map((sent) => ({
            name: emailNames[sent.kind] ?? sent.kind,
            at: sent.sent_at,
            to: null as string | null,
        })),
        ...(summaries.data ?? []).map((sent) => ({
            name: emailNames[sent.notification_type] ?? sent.notification_type,
            at: sent.delivery_date,
            to: sent.recipient_email as string | null,
        })),
    ].sort((a, b) => b.at.localeCompare(a.at));

    return (
        <div>
            <Button render={<Link href="/admin/businesses" />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                All businesses
            </Button>

            <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-[#FF593F]">{row.category}</p>

                    <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{row.name}</h1>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <BusinessStatusBadge status={row.approval_status} />
                        {row.is_sample && <Badge variant="outline">Sample</Badge>}
                        <span className="text-sm text-[#17233B]/65">Joined {when(row.created_at)}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {row.approval_status === "approved" && (
                        <Button render={<Link href={businessPath(row)} target="_blank" />} nativeButton={false} variant="outline" size="sm">
                            Public page
                            <FiExternalLink aria-hidden="true" />
                        </Button>
                    )}

                    <Button render={<Link href={`/business/${row.id}`} />} nativeButton={false} variant="outline" size="sm">
                        Their dashboard
                    </Button>
                </div>
            </header>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Card className="border-[#17233B]/10">
                    <CardHeader><h2 className="text-lg font-semibold">Contact</h2></CardHeader>
                    <CardContent>
                        <Facts
                            rows={[
                                ["Contact email", row.contact_email],
                                ["Account holders", (managers.data as string[] | null)?.join(", ") ?? "—"],
                                ["Website", row.website_url],
                                [
                                    "Address",
                                    [location?.address_line_1, location?.city, location?.region, location?.postal_code]
                                        .filter(Boolean)
                                        .join(", "),
                                ],
                            ]}
                        />
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardHeader><h2 className="text-lg font-semibold">Billing</h2></CardHeader>
                    <CardContent>
                        {subscription.data ? (
                            <Facts
                                rows={[
                                    ["Plan", tierNames[subscription.data.tier] ?? subscription.data.tier],
                                    ["Status", statusNames[subscription.data.status] ?? subscription.data.status],
                                    ["Trial ends", when(subscription.data.trial_end)],
                                    ["Started", when(subscription.data.created_at)],
                                    ["Stripe customer", <span key="c" className="font-mono text-xs">{subscription.data.stripe_customer_id}</span>],
                                ]}
                            />
                        ) : (
                            <p className="text-sm text-[#17233B]/65">
                                On the Free plan. No subscription has ever been started.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardHeader><h2 className="text-lg font-semibold">Activity</h2></CardHeader>
                    <CardContent>
                        <Facts
                            rows={[
                                ["Offers", `${live} live of ${offers.count ?? 0}`],
                                ["Vouchers claimed", redemptions.count ?? 0],
                                ["Followers", followers.count ?? 0],
                                ["Page views", views.count ?? 0],
                            ]}
                        />
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10 lg:row-span-2">
                    <CardHeader>
                        <h2 className="text-lg font-semibold">Emails we have sent</h2>
                    </CardHeader>

                    <CardContent>
                        {history.length === 0 ? (
                            <p className="text-sm text-[#17233B]/65">
                                Nothing yet. Setup and conversion emails appear here as the
                                daily job sends them.
                            </p>
                        ) : (
                            <ol className="space-y-3 text-sm">
                                {history.map((sent, index) => (
                                    <li key={`${sent.name}-${sent.at}-${index}`} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#17233B]/10 pb-3 last:border-0 last:pb-0">
                                        <span className="font-medium">{sent.name}</span>
                                        <span className="text-right text-[#17233B]/65">
                                            {when(sent.at)}
                                            {sent.to && <span className="block text-xs">{sent.to}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function AdminBusinessPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <Overview {...props} />
        </Suspense>
    );
}
