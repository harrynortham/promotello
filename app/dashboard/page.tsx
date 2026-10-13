import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

type Business = {
    id: string;
    role: "owner" | "admin" | "member";
    name: string;
    category: string;
    description: string | null;
    approval_status: "pending" | "approved" | "rejected" | "suspended";
    business_locations: {
        name: string;
        address_line_1: string;
        city: string;
        region: string | null;
        postal_code: string | null;
    }[];
};

const statusStyles: Record<Business["approval_status"], string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-slate-100 text-slate-700",
};

function DashboardLoading() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
                <div className="h-5 w-40 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-4 h-12 w-72 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-10 h-56 animate-pulse rounded-3xl bg-white" />
            </div>
        </main>
    );
}

async function DashboardContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: memberships, error } = await supabase
        .from("business_members")
        .select(
            "role, businesses (id, name, category, description, approval_status, business_locations (name, address_line_1, city, region, postal_code))",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    const businesses = (memberships ?? [])
        .map((membership) => {
            const business = membership.businesses as unknown as Omit<
                Business,
                "role"
            >;

            return {
                ...business,
                role: membership.role as Business["role"],
            };
        })
        .filter(Boolean);

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Your dashboard
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            Welcome back
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">{user.email}</p>
                    </div>

                    <Button
                        render={<Link href="/#offers" />}
                        nativeButton={false}
                        variant="default"
                        size="sm"
                    >
                        Browse deals
                    </Button>
                </header>

                {error ? (
                    <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                        We couldn’t load your businesses. Please refresh and try again.
                    </div>
                ) : businesses.length === 0 ? (
                    <section className="mt-10 rounded-3xl bg-white p-8 shadow-sm sm:p-12">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#FF593F]">
                            Customer account
                        </p>

                        <h2 className="mt-3 text-3xl font-semibold">
                            Discover local deals
                        </h2>

                        <p className="mt-4 max-w-xl leading-7 text-[#17233B]/65">
                            You can browse approved offers and redeem deals from local
                            businesses. Your redeemed offers will appear here when available.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <Button
                                render={<Link href="/#offers" />}
                                nativeButton={false}
                                variant="default"
                            >
                                Explore deals
                            </Button>
                            <Button
                                render={<Link href="/dashboard/redemptions" />}
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                            >
                                My redemptions
                            </Button>

                            <Button
                                render={<Link href="/onboarding" />}
                                nativeButton={false}
                                variant="outline"
                            >
                                Add a business
                            </Button>
                        </div>
                    </section>
                ) : (
                    <>
                        <section className="mt-10 rounded-3xl bg-white p-7 shadow-sm">
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#FF593F]">
                                Customer account
                            </p>

                            <h2 className="mt-2 text-2xl font-semibold">
                                Your business memberships
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                                Manage the businesses you own or help operate below.
                            </p>
                        </section>

                        <section className="mt-6 grid gap-6 md:grid-cols-2">
                            {businesses.map((business) => {
                                const location = business.business_locations?.[0];

                                return (
                                    <article
                                        key={business.id}
                                        className="rounded-3xl bg-white p-7 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-[#17233B]/55">
                                                    {business.category}
                                                </p>

                                                <h2 className="mt-1 text-2xl font-semibold">
                                                    {business.name}
                                                </h2>

                                                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#17233B]/45">
                                                    Your role: {business.role}
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[business.approval_status]
                                                    }`}
                                            >
                                                {business.approval_status}
                                            </span>
                                        </div>

                                        {business.description && (
                                            <p className="mt-5 leading-7 text-[#17233B]/65">
                                                {business.description}
                                            </p>
                                        )}

                                        {location && (
                                            <div className="mt-6 border-t border-[#17233B]/10 pt-5 text-sm text-[#17233B]/65">
                                                <p className="font-semibold text-[#17233B]">
                                                    {location.name}
                                                </p>

                                                <p className="mt-1">
                                                    {location.address_line_1}, {location.city}
                                                    {location.region ? `, ${location.region}` : ""}
                                                    {location.postal_code
                                                        ? `, ${location.postal_code}`
                                                        : ""}
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-7 flex flex-wrap gap-3">
                                            {(business.role === "owner" ||
                                                business.role === "admin") && (
                                                    <>
                                                        <Button
                                                            render={
                                                                <Link
                                                                    href={`/dashboard/${business.id}/offers/new`}
                                                                />
                                                            }
                                                            nativeButton={false}
                                                            variant="default"
                                                            size="sm"
                                                        >
                                                            Create promotion
                                                        </Button>

                                                        <Button
                                                            render={
                                                                <Link
                                                                    href={`/dashboard/${business.id}/offers`}
                                                                />
                                                            }
                                                            nativeButton={false}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Promotions
                                                        </Button>
                                                    </>
                                                )}

                                            {business.role === "member" && (
                                                <Button
                                                    render={
                                                        <Link
                                                            href={`/dashboard/${business.id}/offers`}
                                                        />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    View promotions
                                                </Button>
                                            )}

                                            <Button
                                                render={
                                                    <Link
                                                        href={`/dashboard/${business.id}/redemptions`}
                                                    />
                                                }
                                                nativeButton={false}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Redemptions
                                            </Button>

                                            {business.role === "owner" && (
                                                <Button
                                                    render={
                                                        <Link
                                                            href={`/dashboard/${business.id}/team`}
                                                        />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Manage team
                                                </Button>
                                            )}

                                            {(business.role === "owner" ||
                                                business.role === "admin") && (
                                                    <Button
                                                        render={
                                                            <Link
                                                                href={`/dashboard/${business.id}/edit`}
                                                            />
                                                        }
                                                        nativeButton={false}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        Edit business
                                                    </Button>
                                                )}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>

                        <div className="mt-6">
                            <Button
                                render={<Link href="/onboarding" />}
                                nativeButton={false}
                                variant="outline"
                            >
                                Add another business
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardContent />
        </Suspense>
    );
}