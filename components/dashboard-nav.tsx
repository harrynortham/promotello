"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type DashboardNavProps = {
    email?: string | null;
};

export function DashboardNav({ email }: DashboardNavProps) {
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleSignOut() {
        setIsSigningOut(true);

        const supabase = createClient();
        await supabase.auth.signOut();

        window.location.assign("/login");
    }

    return (
        <nav className="flex flex-col gap-4 border-b border-[#17233B]/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
                href="/dashboard"
                className="text-lg font-semibold tracking-tight text-[#17233B]"
            >
                Promotello
            </Link>

            <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link
                    href="/dashboard"
                    className="font-medium text-[#17233B]/70 hover:text-[#17233B]"
                >
                    Dashboard
                </Link>

                <Link
                    href="/dashboard/redemptions"
                    className="font-medium text-[#17233B]/70 hover:text-[#17233B]"
                >
                    My redemptions
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

                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                >
                    {isSigningOut ? "Signing out…" : "Sign out"}
                </Button>
            </div>
        </nav>
    );
}