import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";

type Business = {
    id: string;
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
        .map((membership) => membership.businesses as unknown as Business)
        .filter(Boolean);

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Business dashboard
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            Welcome back
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">{user.email}</p>
                    </div>

                    <Link
                        href="/onboarding"
                        className="inline-flex w-fit rounded-xl bg-[#FF593F] px-5 py-3 font-semibold transition hover:bg-[#E94D36]"
                    >
                        Add a business
                    </Link>
                </header>

                {error ? (
                    <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                        We couldn’t load your businesses. Please refresh and try again.
                    </div>
                ) : businesses.length === 0 ? (
                    <section className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
                        <h2 className="text-2xl font-semibold">
                            Create your first business
                        </h2>

                        <p className="mx-auto mt-3 max-w-md leading-7 text-[#17233B]/65">
                            Add your business details and first location to start creating
                            promotions.
                        </p>

                        <Link
                            href="/onboarding"
                            className="mt-7 inline-flex rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36]"
                        >
                            Get started
                        </Link>
                    </section>
                ) : (
                    <section className="mt-10 grid gap-6 md:grid-cols-2">
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
                                        <Link
                                            href={`/dashboard/${business.id}/offers/new`}
                                            className="rounded-xl bg-[#FF593F] px-4 py-2 text-sm font-semibold transition hover:bg-[#E94D36]"
                                        >
                                            Create promotion
                                        </Link>

                                        <Link
                                            href={`/dashboard/${business.id}/offers`}
                                            className="rounded-xl border border-[#17233B]/15 px-4 py-2 text-sm font-semibold transition hover:bg-[#17233B]/5"
                                        >
                                            Promotions
                                        </Link>

                                        <Link
                                            href={`/dashboard/${business.id}/redemptions`}
                                            className="rounded-xl border border-[#17233B]/15 px-4 py-2 text-sm font-semibold transition hover:bg-[#17233B]/5"
                                        >
                                            Redemptions
                                        </Link>

                                        <Link
                                            href={`/dashboard/${business.id}/team`}
                                            className="rounded-xl border border-[#17233B]/15 px-4 py-2 text-sm font-semibold transition hover:bg-[#17233B]/5"
                                        >
                                            Manage team
                                        </Link>

                                        <Link
                                            href={`/dashboard/${business.id}/edit`}
                                            className="rounded-xl border border-[#17233B]/15 px-4 py-2 text-sm font-semibold transition hover:bg-[#17233B]/5"
                                        >
                                            Edit business
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
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