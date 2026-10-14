import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { AdminNav } from "@/components/admin-nav";

function AdminLoading() {
    return (
        <div className="border-b border-[#17233B]/10 pb-6">
            <div className="h-6 w-40 animate-pulse rounded-md bg-[#17233B]/10" />
        </div>
    );
}

async function AdminShell({
    children,
}: {
    children: React.ReactNode;
}) {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: isAdmin, error } = await supabase.rpc(
        "is_platform_admin",
    );

    if (error || !isAdmin) {
        redirect("/dashboard");
    }

    return (
        <>
            <AdminNav email={user.email} />

            <div className="mt-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Badge
                            variant="outline"
                            className="border-[#17233B]/20 bg-white text-[#17233B]"
                        >
                            Platform administration
                        </Badge>

                        <p className="mt-2 text-sm text-[#17233B]/60">
                            Manage Promotello approvals and platform activity.
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

                <Separator className="my-6" />

                <nav className="flex flex-wrap gap-2">
                    <Button
                        render={<Link href="/admin" />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                    >
                        Admin overview
                    </Button>

                    <Button
                        render={<Link href="/admin/businesses" />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                    >
                        Business approvals
                    </Button>

                    <Button
                        render={<Link href="/admin/offers" />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                    >
                        Promotion approvals
                    </Button>
                </nav>
            </div>

            {children}
        </>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#FFF8F0] px-6 py-6 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-5xl">
                <Suspense fallback={<AdminLoading />}>
                    <AdminShell>{children}</AdminShell>
                </Suspense>
            </div>
        </div>
    );
}