import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AdminNav } from "@/components/admin-nav";

function AdminLoading() {
    return (
        <div className="border-b border-[#17233B]/10 pb-6">
            <div className="h-6 w-40 animate-pulse rounded bg-[#17233B]/10" />
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

            <div className="mt-8 flex flex-wrap gap-4 border-b border-[#17233B]/10 pb-6 text-sm">
                <a
                    href="/admin/businesses"
                    className="font-semibold text-[#17233B]/70 hover:text-[#17233B]"
                >
                    Business approvals
                </a>

                <a
                    href="/admin/offers"
                    className="font-semibold text-[#17233B]/70 hover:text-[#17233B]"
                >
                    Promotion approvals
                </a>
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