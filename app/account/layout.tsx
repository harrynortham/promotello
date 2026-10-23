import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import AccountNav from "@/components/account-nav";
import AccountFooter from "@/components/account-footer";
import AccountSettingsNav from "@/components/account-settings-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

// Signed-in area: keep it out of search results.
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

type AccountLayoutProps = {
    children: ReactNode;
};

function AccountLoading() {
    return (
        <div
            role="status"
            aria-label="Loading your account"
            className="space-y-6"
        >
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-72 max-w-full" />
            <Skeleton className="h-80 rounded-2xl" />
        </div>
    );
}

async function AccountShell({
    children,
}: AccountLayoutProps) {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return <>{children}</>;
}

export default function AccountLayout({
    children,
}: AccountLayoutProps) {
    return (
        <div className="flex min-h-dvh flex-col bg-[#FFF8F0] text-[#17233B]">
            <AccountNav />

            <div className="flex-1 px-6 py-8 sm:px-10 lg:py-12">
                <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
                    <aside className="min-w-0">
                        <div className="lg:sticky lg:top-28">
                            <AccountSettingsNav />
                        </div>
                    </aside>

                    <main
                        id="account-content"
                        className="min-w-0"
                    >
                        <Suspense fallback={<AccountLoading />}>
                            <AccountShell>
                                {children}
                            </AccountShell>
                        </Suspense>
                    </main>
                </div>
            </div>

            <AccountFooter />
        </div>
    );
}