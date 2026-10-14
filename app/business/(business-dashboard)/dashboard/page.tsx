import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";

type BusinessLocation = {
    address_line_1: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
};

type Business = {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    approval_status: string;
    business_locations: BusinessLocation[] | BusinessLocation | null;
};

type Membership = {
    role: "owner" | "admin" | "member";
    businesses: Business | Business[] | null;
};

type OfferSummary = {
    id: string;
    approval_status: string;
    max_redemptions: number | null;
    redemption_count: number | null;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-6xl">
                <div className="h-10 w-64 animate-pulse rounded bg-[#17233B]/10" />

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                    <div className="h-72 animate-pulse rounded-3xl bg-white" />
                    <div className="h-72 animate-pulse rounded-3xl bg-white" />
                </div>
            </div>
        </main>
    );
}

function MetricCard({
    label,
    value,
    description,
}: {
    label: string;
    value: number;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-[#17233B]/10 bg-[#FFF8F0] p-4">
            <p className="text-sm text-[#17233B]/60">{label}</p>

            <p className="mt-2 text-3xl font-semibold text-[#17233B]">{value}</p>

            <p className="mt-1 text-xs text-[#17233B]/50">{description}</p>
        </div>
    );
}

async function BusinessDashboardContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data, error } = await supabase
        .from("business_members")
        .select(
            `
        role,
        businesses (
          id,
          name,
          category,
          description,
          approval_status,
          business_locations (
            address_line_1,
            city,
            region,
            postal_code
          )
        )
      `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (error) {
        throw new Error("Unable to load your businesses.");
    }

    const memberships = (data ?? []) as Membership[];

    const businesses = memberships
        .map((membership) => {
            const business = Array.isArray(membership.businesses)
                ? membership.businesses[0]
                : membership.businesses;

            if (!business) {
                return null;
            }

            return {
                ...business,
                role: membership.role,
            };
        })
        .filter(Boolean) as Array<Business & { role: Membership["role"] }>;

    if (businesses.length === 0) {
        redirect("/onboarding");
    }

    const businessCards = await Promise.all(
        businesses.map(async (business) => {
            const [
                { data: offers },
                { count: redemptionCount },
            ] = await Promise.all([
                supabase
                    .from("offers")
                    .select("id, approval_status, max_redemptions, redemption_count")
                    .eq("business_id", business.id),
                supabase
                    .from("offer_redemptions")
                    .select("id", { count: "exact", head: true })
                    .eq("business_id", business.id),
            ]);

            const offerSummaries = (offers ?? []) as OfferSummary[];

            const approvedOffers = offerSummaries.filter(
                (offer) => offer.approval_status === "approved",
            );

            const lowInventoryOffers = approvedOffers.filter((offer) => {
                if (offer.max_redemptions === null) {
                    return false;
                }

                const used = offer.redemption_count ?? 0;
                const remaining = offer.max_redemptions - used;

                return remaining <= 10 && remaining > 0;
            });

            return {
                business,
                totalOffers: offerSummaries.length,
                approvedOffers: approvedOffers.length,
                totalRedemptions: redemptionCount ?? 0,
                lowInventoryOffers: lowInventoryOffers.length,
            };
        }),
    );

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-[#FF593F]">
                            Business dashboard
                        </p>

                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17233B]">
                            Business overview
                        </h1>

                        <p className="mt-3 max-w-2xl text-[#17233B]/65">
                            Monitor your promotions, redemptions and business activity.
                        </p>
                    </div>

                    <Button
                        render={<Link href="/dashboard" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Customer dashboard
                    </Button>
                </div>

                <div className="mt-10 space-y-8">
                    {businessCards.map(
                        ({
                            business,
                            totalOffers,
                            approvedOffers,
                            totalRedemptions,
                            lowInventoryOffers,
                        }) => {
                            const location = Array.isArray(business.business_locations)
                                ? business.business_locations[0]
                                : business.business_locations;

                            const locationText = [location?.city, location?.region]
                                .filter(Boolean)
                                .join(", ");

                            const isApproved = business.approval_status === "approved";
                            const canManage =
                                business.role === "owner" || business.role === "admin";

                            return (
                                <article
                                    key={business.id}
                                    className="rounded-3xl border border-[#17233B]/10 bg-white p-7 shadow-sm"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-[#17233B]/55">
                                                {business.category || "Business"}
                                            </p>

                                            <h2 className="mt-1 text-2xl font-semibold text-[#17233B]">
                                                {business.name}
                                            </h2>

                                            {locationText && (
                                                <p className="mt-2 text-sm text-[#17233B]/60">
                                                    {locationText}
                                                </p>
                                            )}
                                        </div>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${isApproved
                                                    ? "bg-green-100 text-green-700"
                                                    : business.approval_status === "rejected"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-amber-100 text-amber-700"
                                                }`}
                                        >
                                            {business.approval_status}
                                        </span>
                                    </div>

                                    {business.description && (
                                        <p className="mt-5 text-sm leading-6 text-[#17233B]/65">
                                            {business.description}
                                        </p>
                                    )}

                                    {!isApproved && (
                                        <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                                            This business must be approved before its promotions
                                            appear publicly.
                                        </div>
                                    )}

                                    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <MetricCard
                                            label="Total promotions"
                                            value={totalOffers}
                                            description="All promotions created"
                                        />

                                        <MetricCard
                                            label="Approved promotions"
                                            value={approvedOffers}
                                            description="Currently approved"
                                        />

                                        <MetricCard
                                            label="Redemptions"
                                            value={totalRedemptions}
                                            description="Customer redemptions"
                                        />

                                        <MetricCard
                                            label="Low inventory"
                                            value={lowInventoryOffers}
                                            description="Promotions nearing their limit"
                                        />
                                    </div>

                                    {lowInventoryOffers > 0 && (
                                        <div className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm text-orange-800">
                                            {lowInventoryOffers} promotion
                                            {lowInventoryOffers === 1 ? "" : "s"} nearing the usage
                                            limit.
                                        </div>
                                    )}

                                    <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                        <Button
                                            render={
                                                <Link href={`/business/${business.id}/offers`} />
                                            }
                                            nativeButton={false}
                                            variant="default"
                                            size="sm"
                                        >
                                            Manage promotions
                                        </Button>

                                        <Button
                                            render={
                                                <Link
                                                    href={`/business/${business.id}/redemptions`}
                                                />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                        >
                                            View redemptions
                                        </Button>

                                        {canManage && (
                                            <>
                                                <Button
                                                    render={
                                                        <Link href={`/business/${business.id}/analytics`} />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    View analytics
                                                </Button>

                                                <Button
                                                    render={
                                                        <Link href={`/business/${business.id}/team`} />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Manage team
                                                </Button>

                                                <Button
                                                    render={
                                                        <Link href={`/business/${business.id}/edit`} />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Edit business
                                                </Button>

                                                <Button
                                                    render={
                                                        <Link
                                                            href={`/business/${business.id}/settings/notifications`}
                                                        />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Notifications
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            );
                        },
                    )}
                </div>

                <div className="mt-8">
                    <Button
                        render={<Link href="/onboarding" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Add another business
                    </Button>
                </div>
            </div>
        </main>
    );
}

export default function BusinessDashboardPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessDashboardContent />
        </Suspense>
    );
}