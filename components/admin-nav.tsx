"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type AdminNavProps = {
    email?: string | null;
};

export function AdminNav({ email }: AdminNavProps) {
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
        <nav className="rounded-xl border border-[#17233B]/10 bg-[#17233B] px-5 py-4 text-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        render={<Link href="/admin" />}
                        nativeButton={false}
                        variant="link"
                        size="sm"
                        className="h-auto p-0 font-semibold text-white hover:text-white"
                    >
                        Promotello Admin
                    </Button>

                    <Badge
                        variant="outline"
                        className="border-[#FF8F7D]/40 bg-[#FF8F7D]/10 text-[#FFB0A3]"
                    >
                        Admin
                    </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        render={<Link href="/admin/businesses" />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                        className="text-white/75 hover:bg-white/10 hover:text-white"
                    >
                        Business approvals
                    </Button>

                    <Button
                        render={<Link href="/admin/offers" />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                        className="text-white/75 hover:bg-white/10 hover:text-white"
                    >
                        Promotion approvals
                    </Button>

                    <Button
                        render={<Link href="/admin/audit-logs" />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                        className="text-white/75 hover:bg-white/10 hover:text-white"
                    >
                        Audit log
                    </Button>

                    {email && (
                        <Badge
                            variant="outline"
                            className="hidden border-white/20 bg-white/5 text-white/60 md:inline-flex"
                        >
                            {email}
                        </Badge>
                    )}

                    <Button
                        type="button"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        variant="ghost"
                        size="sm"
                        className="font-semibold text-[#FF8F7D] hover:bg-white/10 hover:text-[#FFB0A3]"
                    >
                        {isSigningOut ? "Signing out…" : "Sign out"}
                    </Button>
                </div>
            </div>
        </nav>
    );
}