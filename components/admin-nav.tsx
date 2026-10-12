"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
        <nav className="rounded-2xl border border-[#17233B]/10 bg-[#17233B] px-5 py-4 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/admin" className="font-semibold">
                    Promotello Admin
                </Link>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <Link
                        href="/admin/businesses"
                        className="text-white/75 hover:text-white"
                    >
                        Business approvals
                    </Link>

                    <Link
                        href="/admin/offers"
                        className="text-white/75 hover:text-white"
                    >
                        Promotion approvals
                    </Link>


                    <Link
                        href="/admin/audit-logs"
                        className="text-white/75 hover:text-white"
                    >
                        Audit log
                    </Link>

                    {email && (
                        <span className="hidden text-white/50 md:inline">{email}</span>
                    )}

                    <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="font-semibold text-[#FF8F7D] hover:text-[#FFB0A3] disabled:opacity-60"
                    >
                        {isSigningOut ? "Signing out…" : "Sign out"}
                    </button>
                </div>
            </div>
        </nav>
    );
}