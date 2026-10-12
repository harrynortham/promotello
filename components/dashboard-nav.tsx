"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type DashboardNavProps = {
    email?: string | null;
};

export function DashboardNav({ email }: DashboardNavProps) {
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleSignOut() {
        setIsSigningOut(true);

        const supabase = createClient();
        await supabase.auth.signOut();

        router.replace("/login");
        router.refresh();
    }

    return (
        <nav className="flex flex-col gap-4 border-b border-[#17233B]/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
                href="/dashboard"
                className="text-lg font-semibold tracking-tight text-[#17233B]"
            >
                Promotello
            </Link>

            <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link
                    href="/dashboard"
                    className="font-medium text-[#17233B]/70 hover:text-[#17233B]"
                >
                    Dashboard
                </Link>

                <Link
                    href="/onboarding"
                    className="font-medium text-[#17233B]/70 hover:text-[#17233B]"
                >
                    Add business
                </Link>

                {email && (
                    <span className="hidden text-[#17233B]/50 md:inline">
                        {email}
                    </span>
                )}

                <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="font-semibold text-[#FF593F] hover:text-[#E94D36] disabled:opacity-60"
                >
                    {isSigningOut ? "Signing out…" : "Sign out"}
                </button>
            </div>
        </nav>
    );
}