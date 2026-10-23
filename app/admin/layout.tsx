import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AdminSidebarNav } from "@/components/admin-sidebar-nav";
import { AppFooter } from "@/components/site/footers";
import { AdminAppHeader } from "@/components/site/headers";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

// Signed-in area: keep it out of search results.
export const metadata: Metadata = {
    title: "Admin",
    robots: { index: false, follow: false },
};

function NavLoading() {
    return (
        <div className="flex gap-2 lg:flex-col">
            {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-9 w-32 rounded-full lg:w-full" />
            ))}
        </div>
    );
}

function ContentLoading() {
    return (
        <div role="status" aria-label="Loading" className="space-y-6">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-5 w-80 max-w-full" />
            <Skeleton className="h-80 rounded-2xl" />
        </div>
    );
}

// Signed-in platform admins only; everyone else is sent away.
async function requireAdmin() {
    await connection();

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/admin");
    }

    const { data: isAdmin, error } = await supabase.rpc("is_platform_admin");

    if (error || !isAdmin) {
        redirect("/dashboard");
    }

    return supabase;
}

async function AdminNavWithCounts() {
    const supabase = await requireAdmin();

    const [{ count: businesses }, { count: offers }, { count: billing }] = await Promise.all([
        supabase.from("businesses").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("billing_alerts").select("id", { count: "exact", head: true }).is("resolved_at", null),
    ]);

    return (
        <AdminSidebarNav
            counts={{ businesses: businesses ?? 0, offers: offers ?? 0, billing: billing ?? 0 }}
        />
    );
}

async function AdminContent({ children }: { children: ReactNode }) {
    await requireAdmin();
    return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-[#FFF8F0] text-[#17233B]">
            <AdminAppHeader />

            <div className="flex-1 px-6 py-8 sm:px-10 lg:py-12">
                <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
                    <aside className="min-w-0">
                        <div className="lg:sticky lg:top-28">
                            <Suspense fallback={<NavLoading />}>
                                <AdminNavWithCounts />
                            </Suspense>
                        </div>
                    </aside>

                    <main id="admin-content" className="min-w-0">
                        <Suspense fallback={<ContentLoading />}>
                            <AdminContent>{children}</AdminContent>
                        </Suspense>
                    </main>
                </div>
            </div>

            <AppFooter variant="admin" />
        </div>
    );
}
