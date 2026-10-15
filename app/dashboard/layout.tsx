import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import DashboardNav from "@/components/dashboard-nav";
import Footer from "@/components/footer";

function DashboardLoading() {
    return (
        <div className="space-y-6">

            <div className="h-64 animate-pulse rounded-3xl bg-white" />
        </div>
    );
}

async function DashboardShell({
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

    return <main>{children}</main>;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col bg-[#FFF8F0] text-[#17233B]">
            <DashboardNav />

            <div className="flex-1 px-6 pb-12 sm:px-10">
                <div className="mx-auto max-w-7xl">
                    <Suspense fallback={<DashboardLoading />}>
                        <DashboardShell>{children}</DashboardShell>
                    </Suspense>
                </div>
            </div>

            <Footer />
        </div>
    );
}