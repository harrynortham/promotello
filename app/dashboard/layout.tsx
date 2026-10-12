import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";

function DashboardLoading() {
    return (
        <div className="border-b border-[#17233B]/10 pb-6">
            <div className="h-6 w-32 animate-pulse rounded bg-[#17233B]/10" />
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

    return (
        <>
            <DashboardNav email={user.email} />
            {children}
        </>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#FFF8F0] px-6 py-6 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-5xl">
                <Suspense fallback={<DashboardLoading />}>
                    <DashboardShell>{children}</DashboardShell>
                </Suspense>
            </div>
        </div>
    );
}