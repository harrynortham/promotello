import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";

function AdminHomeLoading() {
    return (
        <main className="mt-8">
            <div className="h-12 w-72 animate-pulse rounded bg-[#17233B]/10" />

            <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="h-48 animate-pulse rounded-3xl bg-white" />
                <div className="h-48 animate-pulse rounded-3xl bg-white" />
            </div>
        </main>
    );
}

async function AdminHomeContent() {
    await connection();

    const supabase = await createClient();

    const [{ count: pendingBusinesses }, { count: pendingOffers }] =
        await Promise.all([
            supabase
                .from("businesses")
                .select("id", { count: "exact", head: true })
                .eq("approval_status", "pending"),

            supabase
                .from("offers")
                .select("id", { count: "exact", head: true })
                .eq("approval_status", "pending"),
        ]);

    return (
        <main className="mt-8">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    Administration
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    Admin overview
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Manage business and promotion approvals across Promotello.
                </p>
            </div>

            <section className="mt-10 grid gap-6 md:grid-cols-2">
                <Link
                    href="/admin/businesses"
                    className="rounded-3xl bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#FF593F]">
                        Businesses
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold">
                        Review businesses
                    </h2>

                    <p className="mt-3 leading-7 text-[#17233B]/65">
                        Approve or reject businesses waiting to join Promotello.
                    </p>

                    <p className="mt-7 text-4xl font-semibold">
                        {pendingBusinesses ?? 0}
                    </p>

                    <p className="mt-1 text-sm text-[#17233B]/55">
                        pending approval
                    </p>
                </Link>

                <Link
                    href="/admin/offers"
                    className="rounded-3xl bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#FF593F]">
                        Promotions
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold">
                        Review promotions
                    </h2>

                    <p className="mt-3 leading-7 text-[#17233B]/65">
                        Approve or reject promotions submitted by businesses.
                    </p>

                    <p className="mt-7 text-4xl font-semibold">
                        {pendingOffers ?? 0}
                    </p>

                    <p className="mt-1 text-sm text-[#17233B]/55">
                        pending approval
                    </p>
                </Link>
            </section>

            <section className="mt-8 rounded-3xl bg-[#17233B] p-8 text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#FF8F7D]">
                    Quick access
                </p>

                <h2 className="mt-3 text-2xl font-semibold">
                    Keep Promotello healthy
                </h2>

                <p className="mt-3 max-w-xl leading-7 text-white/70">
                    Review new businesses first, then approve their promotions once the
                    business information has been verified.
                </p>
            </section>
        </main>
    );
}

export default function AdminHomePage() {
    return (
        <Suspense fallback={<AdminHomeLoading />}>
            <AdminHomeContent />
        </Suspense>
    );
}