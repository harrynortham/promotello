import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

type BusinessLayoutProps = {
    children: React.ReactNode;
    params: Promise<{
        businessId: string;
    }>;
};

function BusinessLayoutLoading() {
    return (
        <div className="min-h-screen bg-[#FFF8F0]">
            <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
                <aside className="hidden w-64 shrink-0 lg:block">
                    <div className="rounded-xl border border-[#17233B]/10 bg-white p-5">
                        <Skeleton className="h-5 w-32 rounded-md" />
                        <Skeleton className="mt-5 h-8 w-48 rounded-md" />
                        <Skeleton className="mt-3 h-6 w-24 rounded-full" />

                        <Separator className="my-5" />

                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <Skeleton key={item} className="h-9 w-full rounded-md" />
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="mt-8 h-96 w-full rounded-xl" />
                </main>
            </div>
        </div>
    );
}

async function BusinessLayoutContent({
    children,
    params,
}: BusinessLayoutProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role, businesses(id, name, approval_status)")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        redirect("/business/dashboard");
    }

    const business = Array.isArray(membership.businesses)
        ? membership.businesses[0]
        : membership.businesses;

    const canManage =
        membership.role === "owner" || membership.role === "admin";

    return (
        <div className="min-h-screen bg-[#FFF8F0]">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row lg:items-start">
                <aside className="w-full shrink-0 lg:sticky lg:top-8 lg:w-64">
                    <div className="rounded-xl border border-[#17233B]/10 bg-white p-5 shadow-sm">
                        <Button
                            render={<Link href="/business/dashboard" />}
                            nativeButton={false}
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-[#FF593F]"
                        >
                            ← All businesses
                        </Button>

                        <h2 className="mt-5 text-xl font-semibold">
                            {business?.name ?? "Business"}
                        </h2>

                        <Badge
                            variant="outline"
                            className="mt-3 capitalize"
                        >
                            {business?.approval_status ?? "pending"}
                        </Badge>

                        <Separator className="my-5" />

                        <nav className="flex flex-col gap-1">
                            <Button
                                render={<Link href={`/business/${businessId}`} />}
                                nativeButton={false}
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                            >
                                Overview
                            </Button>

                            <Button
                                render={
                                    <Link href={`/business/${businessId}/offers`} />
                                }
                                nativeButton={false}
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                            >
                                Promotions
                            </Button>

                            <Button
                                render={
                                    <Link
                                        href={`/business/${businessId}/redemptions`}
                                    />
                                }
                                nativeButton={false}
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                            >
                                Redemptions
                            </Button>

                            {canManage && (
                                <>
                                    <Button
                                        render={
                                            <Link
                                                href={`/business/${businessId}/analytics`}
                                            />
                                        }
                                        nativeButton={false}
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start"
                                    >
                                        Analytics
                                    </Button>

                                    <Button
                                        render={
                                            <Link href={`/business/${businessId}/team`} />
                                        }
                                        nativeButton={false}
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start"
                                    >
                                        Team
                                    </Button>

                                    <Button
                                        render={
                                            <Link href={`/business/${businessId}/edit`} />
                                        }
                                        nativeButton={false}
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start"
                                    >
                                        Edit business
                                    </Button>

                                    <Button
                                        render={
                                            <Link
                                                href={`/business/${businessId}/settings/notifications`}
                                            />
                                        }
                                        nativeButton={false}
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start"
                                    >
                                        Notifications
                                    </Button>
                                </>
                            )}
                        </nav>

                        <Separator className="my-5" />

                        <Button
                            render={<Link href="/dashboard" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                            className="w-full"
                        >
                            Customer area
                        </Button>
                    </div>
                </aside>

                <section className="min-w-0 flex-1">{children}</section>
            </div>
        </div>
    );
}

export default function BusinessLayout(props: BusinessLayoutProps) {
    return (
        <Suspense fallback={<BusinessLayoutLoading />}>
            <BusinessLayoutContent {...props} />
        </Suspense>
    );
}