"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserProfile } from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/client";
import { UserAvatar } from "./user-avatar";

// The same account links everywhere, so users always know where to find them.
export const accountLinks = [
    { label: "My vouchers", href: "/dashboard" },
    { label: "Business dashboard", href: "/business/dashboard" },
    { label: "Account settings", href: "/account" },
];

function useSignOut(redirectTo: string) {
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [error, setError] = useState("");

    async function signOut() {
        if (isSigningOut) return;

        setIsSigningOut(true);
        setError("");

        const { error: signOutError } = await createClient().auth.signOut();

        if (signOutError) {
            setError("We couldn’t sign you out. Please try again.");
            setIsSigningOut(false);
            return;
        }

        router.push(redirectTo);
        router.refresh();
    }

    return { signOut, isSigningOut, error };
}

function UserSummary({ user, size }: { user: UserProfile; size: number }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <UserAvatar src={user.avatarUrl} initials={user.initials} size={size} />

            <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
        </div>
    );
}

// Avatar button with a dropdown of account links, for desktop headers.
export function UserMenu({
    user,
    signOutRedirect = "/",
}: {
    user: UserProfile;
    signOutRedirect?: string;
}) {
    const { signOut, isSigningOut, error } = useSignOut(signOutRedirect);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Open account menu for ${user.displayName}`}
                        className="h-auto gap-3 rounded-full px-2 py-1.5"
                    />
                }
            >
                <span className="hidden min-w-0 text-right sm:block">
                    <span className="block max-w-40 truncate text-sm font-semibold">
                        {user.displayName}
                    </span>
                    <span className="block max-w-40 truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                </span>

                <UserAvatar src={user.avatarUrl} initials={user.initials} />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
                <div className="px-2 py-3">
                    <UserSummary user={user} size={40} />
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    {accountLinks.map((link) => (
                        <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                            {link.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <DropdownMenuItem
                        disabled={isSigningOut}
                        onClick={signOut}
                        className="text-destructive focus:text-destructive"
                    >
                        {isSigningOut ? "Signing out…" : "Sign out"}
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                {error && (
                    <p role="alert" className="px-2 pb-2 text-xs text-destructive">
                        {error}
                    </p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
