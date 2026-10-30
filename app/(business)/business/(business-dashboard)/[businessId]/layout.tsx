import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessMobileNav } from "@/components/business-mobile-nav";
import { BusinessSidebarNav } from "@/components/business-sidebar-nav";
import { BusinessSwitcher } from "@/components/business-switcher";
import { approvalLabel } from "@/lib/business-status";
import { createClient } from "@/utils/supabase/server";

type BusinessLayoutProps = {
    children: React.ReactNode;
    params: Promise<{
        businessId: string;
    }>;
};

type Business = {
    id: string;
    name: string;
    logo_url: string | null;
    approval_status: string;
};

function BusinessLayoutLoading() {
    return (
        <div className="min-h-screen bg-[#FFF8F0]">
            <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
                <aside className="hidden w-64 shrink-0 lg:block">
                    <div className="rounded-xl border border-[#17233B]/10 bg-white p-5">
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="mt-5 h-8 w-48 rounded-md" />
                        <Skeleton className="mt-3 h-6 w-24 rounded-full" />

                        <Separator className="my-5" />

                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <Skeleton
                                    key={item}
                                    className="h-9 w-full rounded-md"
                                />
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

    const { data: memberships } = await supabase
        .from("business_members")
        .select(
            `
                role,
                business_id,
                businesses (
                    id,
                    name,
                    logo_url,
                    approval_status
                )
            `,
        )
        .eq("user_id", user.id);

    const membership = memberships?.find(
        (item) => item.business_id === businessId,
    );

    if (!membership) {
        redirect("/business/dashboard");
    }

    const currentBusiness = Array.isArray(membership.businesses)
        ? membership.businesses[0]
        : membership.businesses;

    if (!currentBusiness) {
        redirect("/business/dashboard");
    }

    const businesses: Business[] =
        memberships
            ?.map((item) => {
                const business = Array.isArray(item.businesses)
                    ? item.businesses[0]
                    : item.businesses;

                return business;
            })
            .filter(
                (business): business is Business =>
                    Boolean(business?.id && business?.name),
            ) ?? [];

    const canManage =
        membership.role === "owner" || membership.role === "admin";

    return (
        <div className="min-h-screen bg-[#FFF8F0]">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row lg:items-start">
                <div className="flex items-center justify-between lg:hidden">
                    <div>
                        <p className="font-semibold text-[#17233B]">
                            {currentBusiness.name}
                        </p>

                        <p className="text-sm text-[#17233B]/70">
                            Business management
                        </p>
                    </div>

                    <BusinessMobileNav
                        businessId={businessId}
                        businessName={currentBusiness.name}
                        businessLogoUrl={currentBusiness.logo_url}
                        approvalStatus={currentBusiness.approval_status}
                        canManage={canManage}
                        businesses={businesses}
                    />
                </div>

                <aside className="hidden w-64 shrink-0 lg:sticky lg:top-8 lg:block">
                    <div className="rounded-xl border border-[#17233B]/10 bg-white p-5 shadow-sm">
                        <BusinessSwitcher
                            currentBusinessId={businessId}
                            businesses={businesses}
                        />

                        <Separator className="my-5" />

                        <h2 className="text-xl font-semibold text-[#17233B]">
                            {currentBusiness.name}
                        </h2>

                        <Badge variant="outline" className="mt-3">
                            {approvalLabel(currentBusiness.approval_status)}
                        </Badge>

                        <Separator className="my-5" />

                        <BusinessSidebarNav
                            businessId={businessId}
                            canManage={canManage}
                        />

                        {/* With one business, the dashboard is this overview. */}
                        {businesses.length > 1 && (
                            <>
                                <Separator className="my-5" />

                                <Button
                                    render={<Link href="/business/dashboard" />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    Go to dashboard
                                </Button>
                            </>
                        )}
                    </div>
                </aside>

                <main className="min-w-0 flex-1">{children}</main>
            </div>
        </div>
    );
}

export default function BusinessLayout({
    children,
    params,
}: BusinessLayoutProps) {
    return (
        <Suspense fallback={<BusinessLayoutLoading />}>
            <BusinessLayoutContent params={params}>
                {children}
            </BusinessLayoutContent>
        </Suspense>
    );
}