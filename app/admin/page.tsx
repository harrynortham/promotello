import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";

function AdminHomeLoading() {
    return (
        <main className="mt-8">
            <div className="h-12 w-72 animate-pulse rounded-md bg-[#17233B]/10" />

            <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="h-48 animate-pulse rounded-xl bg-white" />
                <div className="h-48 animate-pulse rounded-xl bg-white" />
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

    const businessCount = pendingBusinesses ?? 0;
    const offerCount = pendingOffers ?? 0;
    const totalPending = businessCount + offerCount;

    return (
        <main className="mt-8">
            <div>
                <Badge
                    variant="outline"
                    className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                >
                    Administration
                </Badge>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#17233B]">
                    Admin overview
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Manage business and promotion approvals across Promotello.
                </p>
            </div>

            {totalPending > 0 && (
                <Alert className="mt-8 border-amber-200 bg-amber-50 text-amber-800">
                    <AlertTitle>Items require review</AlertTitle>

                    <AlertDescription>
                        There are {totalPending} items waiting for approval.
                    </AlertDescription>
                </Alert>
            )}

            {totalPending === 0 && (
                <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-800">
                    <AlertTitle>Everything is up to date</AlertTitle>

                    <AlertDescription>
                        There are no pending businesses or promotions to review.
                    </AlertDescription>
                </Alert>
            )}

            <section className="mt-8 grid gap-6 md:grid-cols-2">
                <Card className="border-[#17233B]/10 shadow-sm">
                    <CardHeader>
                        <Badge
                            variant="outline"
                            className="w-fit border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                        >
                            Businesses
                        </Badge>

                        <CardTitle className="mt-2 text-2xl">
                            Review businesses
                        </CardTitle>

                        <p className="text-[#17233B]/65">
                            Approve or reject businesses waiting to join Promotello.
                        </p>
                    </CardHeader>

                    <CardContent>
                        <Separator className="mb-6" />

                        <p className="text-4xl font-semibold text-[#17233B]">
                            {businessCount}
                        </p>

                        <p className="mt-1 text-sm text-[#17233B]/55">
                            pending approval
                        </p>

                        <Button
                            render={<Link href="/admin/businesses" />}
                            nativeButton={false}
                            variant="default"
                            size="sm"
                            className="mt-6"
                        >
                            Review businesses
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10 shadow-sm">
                    <CardHeader>
                        <Badge
                            variant="outline"
                            className="w-fit border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                        >
                            Promotions
                        </Badge>

                        <CardTitle className="mt-2 text-2xl">
                            Review promotions
                        </CardTitle>

                        <p className="text-[#17233B]/65">
                            Approve or reject promotions submitted by businesses.
                        </p>
                    </CardHeader>

                    <CardContent>
                        <Separator className="mb-6" />

                        <p className="text-4xl font-semibold text-[#17233B]">
                            {offerCount}
                        </p>

                        <p className="mt-1 text-sm text-[#17233B]/55">
                            pending approval
                        </p>

                        <Button
                            render={<Link href="/admin/offers" />}
                            nativeButton={false}
                            variant="default"
                            size="sm"
                            className="mt-6"
                        >
                            Review promotions
                        </Button>
                    </CardContent>
                </Card>
            </section>

            <Card className="mt-8 border-[#17233B] bg-[#17233B] text-white shadow-sm">
                <CardHeader>
                    <Badge
                        variant="outline"
                        className="w-fit border-[#FF8F7D]/40 bg-[#FF8F7D]/10 text-[#FF8F7D]"
                    >
                        Quick access
                    </Badge>

                    <CardTitle className="mt-2 text-2xl text-white">
                        Keep Promotello healthy
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <p className="max-w-xl leading-7 text-white/70">
                        Review new businesses first, then approve their promotions once
                        the business information has been verified.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button
                            render={<Link href="/admin/businesses" />}
                            nativeButton={false}
                            variant="secondary"
                            size="sm"
                        >
                            Manage businesses
                        </Button>

                        <Button
                            render={<Link href="/admin/offers" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                        >
                            Manage promotions
                        </Button>
                    </div>
                </CardContent>
            </Card>
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