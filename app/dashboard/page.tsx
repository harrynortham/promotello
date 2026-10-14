import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <div className="h-10 w-64 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-8 h-48 animate-pulse rounded-3xl bg-white" />
            </div>
        </main>
    );
}

async function CustomerDashboardContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { count: businessCount } = await supabase
        .from("business_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

    const hasBusinessAccess = (businessCount ?? 0) > 0;

    return (
        <main className="px-6 py-6">
            <div className="mx-auto max-w-5xl">
                <section className="rounded-3xl bg-white p-8 shadow-sm">
                    <p className="text-sm font-medium text-[#FF593F]">
                        Customer dashboard
                    </p>

                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17233B]">
                        Welcome back
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Discover local deals, manage your redemptions and update your
                        account.
                    </p>

                    {user.email && (
                        <p className="mt-4 text-sm text-[#17233B]/50">
                            Signed in as {user.email}
                        </p>
                    )}

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button
                            render={<Link href="/#offers" />}
                            nativeButton={false}
                            variant="default"
                            size="sm"
                        >
                            Browse deals
                        </Button>

                        <Button
                            render={<Link href="/dashboard/redemptions" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            My redemptions
                        </Button>

                        {hasBusinessAccess && (
                            <Button
                                render={<Link href="/business/dashboard" />}
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                            >
                                Business dashboard
                            </Button>
                        )}
                    </div>
                </section>

                <section className="mt-8 grid gap-6 md:grid-cols-2">
                    <article className="rounded-3xl border border-[#17233B]/10 bg-white p-7 shadow-sm">
                        <p className="text-sm font-medium text-[#FF593F]">
                            Find your next deal
                        </p>

                        <h2 className="mt-2 text-xl font-semibold text-[#17233B]">
                            Save on the places you love
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-[#17233B]/65">
                            Explore approved local promotions and redeem deals directly from
                            participating businesses.
                        </p>

                        <div className="mt-6">
                            <Button
                                render={<Link href="/#offers" />}
                                nativeButton={false}
                                variant="default"
                                size="sm"
                            >
                                Explore deals
                            </Button>
                        </div>
                    </article>

                    <article className="rounded-3xl border border-[#17233B]/10 bg-white p-7 shadow-sm">
                        <p className="text-sm font-medium text-[#FF593F]">
                            Your activity
                        </p>

                        <h2 className="mt-2 text-xl font-semibold text-[#17233B]">
                            View your redemptions
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-[#17233B]/65">
                            Keep track of the deals you have redeemed and show your codes to
                            businesses.
                        </p>

                        <div className="mt-6">
                            <Button
                                render={<Link href="/dashboard/redemptions" />}
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                            >
                                View redemptions
                            </Button>
                        </div>
                    </article>
                </section>

                <section className="mt-8 rounded-3xl border border-[#17233B]/10 bg-white p-7 shadow-sm">
                    <h2 className="text-xl font-semibold text-[#17233B]">
                        Are you a business owner?
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#17233B]/65">
                        Create a business profile and start publishing promotions for
                        customers in your area.
                    </p>

                    <div className="mt-6">
                        <Button
                            render={<Link href="/onboarding" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            Add a business
                        </Button>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default function CustomerDashboardPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <CustomerDashboardContent />
        </Suspense>
    );
}