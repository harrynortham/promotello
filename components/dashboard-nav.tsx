"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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
            <Button
                render={<Link href="/dashboard" />}
                nativeButton={false}
                variant="link"
                size="sm"
                className="h-auto w-fit p-0 text-lg font-semibold tracking-tight text-[#17233B]"
            >
                Promotello
            </Button>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    render={<Link href="/dashboard" />}
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                >
                    Dashboard
                </Button>

                <Button
                    render={<Link href="/dashboard/redemptions" />}
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                >
                    My redemptions
                </Button>

                <Button
                    render={<Link href="/onboarding" />}
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                >
                    Add business
                </Button>

                {email && (
                    <Badge
                        variant="outline"
                        className="hidden border-[#17233B]/15 bg-white text-[#17233B]/60 md:inline-flex"
                    >
                        {email}
                    </Badge>
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