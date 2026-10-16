"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";

type UserProfile = {
    email: string;
    name: string;
    avatarUrl: string;
};

function getInitials(name: string, email: string) {
    const source = name.trim() || email;

    const initials = source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    return initials || "U";
}

function ProfilePhoto({
    src,
    initials,
    large = false,
}: {
    src: string;
    initials: string;
    large?: boolean;
}) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    return (
        <span
            aria-hidden="true"
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17233B] text-sm font-semibold text-white ${large ? "h-10 w-10" : "h-9 w-9"
                }`}
        >
            {src && failedSrc !== src ? (
                <Image
                    src={src}
                    alt=""
                    width={large ? 40 : 36}
                    height={large ? 40 : 36}
                    className="h-full w-full object-cover"
                    onError={() => setFailedSrc(src)}
                />
            ) : (
                initials
            )}
        </span>
    );
}

export default function DashboardNav() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadUser() {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!isMounted) {
                return;
            }

            if (user) {
                const name =
                    typeof user.user_metadata?.full_name === "string"
                        ? user.user_metadata.full_name
                        : typeof user.user_metadata?.name === "string"
                            ? user.user_metadata.name
                            : "";

                const avatarPath =
                    typeof user.user_metadata?.avatar_path === "string"
                        ? user.user_metadata.avatar_path
                        : "";

                const avatarUrl = avatarPath
                    ? supabase.storage
                        .from("profile-images")
                        .getPublicUrl(avatarPath).data.publicUrl
                    : "";

                setUser({
                    email: user.email ?? "",
                    name,
                    avatarUrl,
                });
            }

            setIsLoading(false);
        }

        void loadUser();

        return () => {
            isMounted = false;
        };
    }, []);

    async function handleSignOut() {
        setIsSigningOut(true);

        const supabase = createClient();
        await supabase.auth.signOut();

        window.location.assign("/login");
    }

    const displayName =
        user?.name || user?.email?.split("@")[0] || "Account";

    const initials = user
        ? getInitials(user.name, user.email)
        : "U";

    return (
        <header className="border-b border-border bg-background px-6">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between">
                <Link href="/" aria-label="Home">
                    <Image
                        src="/brand/promotello-horizontal-primary.svg"
                        alt="Promotello"
                        width={180}
                        height={48}
                        priority
                    />
                </Link>

                {isLoading ? (
                    <div className="h-10 w-32 animate-pulse rounded-full bg-muted" />
                ) : user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="ghost"
                                    aria-label={`Open account menu for ${displayName}`}
                                    className="flex h-auto items-center gap-3 rounded-full px-2 py-1.5"
                                />
                            }
                        >
                            <span className="hidden text-right sm:block">
                                <span className="block text-sm font-semibold text-foreground">
                                    {displayName}
                                </span>

                                <span className="block max-w-40 truncate text-xs text-muted-foreground">
                                    {user.email}
                                </span>
                            </span>

                            <ProfilePhoto
                                src={user.avatarUrl}
                                initials={initials}
                            />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            align="end"
                            className="w-64"
                        >
                            <div className="px-2 py-2">
                                <div className="flex items-center gap-3">
                                    <ProfilePhoto
                                        src={user.avatarUrl}
                                        initials={initials}
                                        large
                                    />

                                    <div className="min-w-0">
                                        <p className="truncate font-semibold">
                                            {displayName}
                                        </p>

                                        <p className="truncate text-xs text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <DropdownMenuSeparator />

                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    render={<Link href="/account" />}
                                >
                                    Account settings
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    render={
                                        <Link href="/business/dashboard" />
                                    }
                                >
                                    Business dashboard
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    render={<Link href="/dashboard" />}
                                >
                                    Customer area
                                </DropdownMenuItem>
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator />

                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    disabled={isSigningOut}
                                    onClick={handleSignOut}
                                    className="text-destructive focus:text-destructive"
                                >
                                    {isSigningOut
                                        ? "Signing out…"
                                        : "Sign out"}
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button
                        render={<Link href="/login" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Sign in
                    </Button>
                )}
            </div>
        </header>
    );
}