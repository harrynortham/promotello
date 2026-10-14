import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";

type BusinessLayoutProps = {
    children: React.ReactNode;
    params: Promise<{
        businessId: string;
    }>;
};

function BusinessLoading() {
    return (
        <div className="min-h-screen bg-[#FFF8F0]">
            <header className="border-b border-[#17233B]/10 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <div className="h-7 w-48 animate-pulse rounded bg-[#17233B]/10" />
                        <div className="h-5 w-36 animate-pulse rounded bg-[#17233B]/10" />
                    </div>
                    <div className="h-8 w-full animate-pulse rounded bg-[#17233B]/10 lg:w-96" />
                </div>
            </header>
        </div>
    );
}

async function BusinessShell({
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
        .select("role, businesses(name)")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        redirect("/business/dashboard");
    }

    const business = Array.isArray(membership.businesses)
        ? membership.businesses[0]
        : membership.businesses;

    const canManageBusiness =
        membership.role === "owner" || membership.role === "admin";

    return (
        <div className="min-h-screen bg-[#FFF8F0]">
            <header className="border-b border-[#17233B]/10 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Link
                            href="/business/dashboard"
                            className="text-lg font-semibold tracking-tight text-[#17233B]"
                        >
                            Promotello Business
                        </Link>

                        <p className="mt-1 text-sm text-[#17233B]/60">
                            {business?.name ?? "Business management"}
                        </p>
                    </div>

                    <nav className="flex flex-wrap items-center gap-2">
                        <Button
                            render={<Link href="/business/dashboard" />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            Businesses
                        </Button>

                        <Button
                            render={<Link href={`/business/${businessId}/offers`} />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            Promotions
                        </Button>

                        <Button
                            render={
                                <Link href={`/business/${businessId}/redemptions`} />
                            }
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            Redemptions
                        </Button>

                        {canManageBusiness && (
                            <>
                                <Button
                                    render={<Link href={`/business/${businessId}/team`} />}
                                    nativeButton={false}
                                    variant="ghost"
                                    size="sm"
                                >
                                    Team
                                </Button>

                                <Button
                                    render={
                                        <Link href={`/business/${businessId}/analytics`} />
                                    }
                                    nativeButton={false}
                                    variant="ghost"
                                    size="sm"
                                >
                                    Analytics
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
                                >
                                    Notifications
                                </Button>

                                <Button
                                    render={<Link href={`/business/${businessId}/edit`} />}
                                    nativeButton={false}
                                    variant="ghost"
                                    size="sm"
                                >
                                    Edit business
                                </Button>
                            </>
                        )}

                        <Button
                            render={<Link href="/dashboard" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            Consumer area
                        </Button>
                    </nav>
                </div>
            </header>

            {children}
        </div>
    );
}

export default function BusinessLayout(props: BusinessLayoutProps) {
    return (
        <Suspense fallback={<BusinessLoading />}>
            <BusinessShell {...props} />
        </Suspense>
    );
}
