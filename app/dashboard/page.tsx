import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <Skeleton className="h-10 w-64 rounded-md" />

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>

                <Skeleton className="mt-8 h-48 w-full rounded-xl" />
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
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <Card className="border-[#17233B]/10 shadow-none">
                    <CardHeader>
                        <Badge
                            variant="outline"
                            className="w-fit border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                        >
                            Customer dashboard
                        </Badge>

                        <CardTitle className="mt-3 text-3xl tracking-tight text-[#17233B]">
                            Welcome back
                        </CardTitle>

                        <p className="text-[#17233B]/65">
                            Discover local deals, manage your redemptions and update your
                            account.
                        </p>

                        {user.email && (
                            <p className="text-sm text-[#17233B]/50">
                                Signed in as {user.email}
                            </p>
                        )}
                    </CardHeader>

                    <CardContent className="flex flex-wrap gap-3">
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
                    </CardContent>
                </Card>

                <section className="mt-8 grid gap-6 md:grid-cols-2">
                    <Card className="border-[#17233B]/10 shadow-none">
                        <CardHeader>
                            <Badge
                                variant="outline"
                                className="w-fit border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                            >
                                Find your next deal
                            </Badge>

                            <CardTitle className="text-xl text-[#17233B]">
                                Save on the places you love
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm leading-6 text-[#17233B]/65">
                                Explore approved local promotions and redeem deals directly
                                from participating businesses.
                            </p>

                            <Button
                                render={<Link href="/#offers" />}
                                nativeButton={false}
                                variant="default"
                                size="sm"
                                className="mt-6"
                            >
                                Explore deals
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10 shadow-none">
                        <CardHeader>
                            <Badge
                                variant="outline"
                                className="w-fit border-[#17233B]/20 bg-[#17233B]/5 text-[#17233B]"
                            >
                                Your activity
                            </Badge>

                            <CardTitle className="text-xl text-[#17233B]">
                                View your redemptions
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm leading-6 text-[#17233B]/65">
                                Keep track of the deals you have redeemed and show your codes
                                to businesses.
                            </p>

                            <Button
                                render={<Link href="/dashboard/redemptions" />}
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                                className="mt-6"
                            >
                                View redemptions
                            </Button>
                        </CardContent>
                    </Card>
                </section>

                <Card className="mt-8 border-[#17233B]/10 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-xl text-[#17233B]">
                            Are you a business owner?
                        </CardTitle>

                        <p className="text-sm leading-6 text-[#17233B]/65">
                            Create a business profile and start publishing promotions for
                            customers in your area.
                        </p>
                    </CardHeader>

                    <CardContent>
                        <Separator className="mb-6" />

                        <Button
                            render={<Link href="/onboarding" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            Add a business
                        </Button>
                    </CardContent>
                </Card>
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