"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

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

function readText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function getInitials(name: string, email: string) {
    const source = name.trim() || email;

    return (
        source
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "U"
    );
}

function ProfileAvatar({
    src,
    initials,
    size = 36,
}: {
    src: string;
    initials: string;
    size?: number;
}) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    return (
        <span
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary"
            style={{ width: size, height: size }}
        >
            {src && failedSrc !== src ? (
                <Image
                    src={src}
                    alt=""
                    width={size}
                    height={size}
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
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const supabase = createClient();
        let isMounted = true;
        let authEventReceived = false;

        function updateUser(authUser: User | null) {
            if (!isMounted) return;

            if (!authUser) {
                setUser(null);
            } else {
                const avatarPath = readText(
                    authUser.user_metadata.avatar_path,
                );

                const avatarUrl = avatarPath
                    ? supabase.storage
                        .from("profile-images")
                        .getPublicUrl(avatarPath).data.publicUrl
                    : "";

                setUser({
                    email: authUser.email ?? "",
                    name:
                        readText(authUser.user_metadata.full_name) ||
                        readText(authUser.user_metadata.name),
                    avatarUrl,
                });
            }

            setIsLoading(false);
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            authEventReceived = true;
            updateUser(session?.user ?? null);
        });

        async function loadUser() {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!authEventReceived) {
                    updateUser(user);
                }
            } catch {
                if (isMounted && !authEventReceived) {
                    setIsLoading(false);
                }
            }
        }

        void loadUser();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    async function handleSignOut() {
        if (isSigningOut) return;

        setIsSigningOut(true);
        setErrorMessage("");

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            router.push("/login");
        } catch {
            setErrorMessage(
                "We couldn’t sign you out. Please try again.",
            );
            setIsSigningOut(false);
        }
    }

    const displayName =
        user?.name || user?.email.split("@")[0] || "Account";

    const initials = user
        ? getInitials(user.name, user.email)
        : "U";

    return (
        <header className="border-b border-border bg-background px-6">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between">
                <Link
                    href="/"
                    aria-label="Promotello home"
                    className="shrink-0"
                >

                    <Image
                        src="/brand/promotello-horizontal-primary.svg"
                        alt="Promotello"
                        width={180}
                        height={48}
                        priority
                    />

                </Link>

                {isLoading ? (
                    <div
                        role="status"
                        aria-label="Loading account"
                        className="h-10 w-10 animate-pulse rounded-full bg-muted sm:w-32"
                    />
                ) : user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="ghost"
                                    aria-label={`Open account menu for ${displayName}`}
                                    className="h-auto gap-3 rounded-full px-2 py-1.5"
                                />
                            }
                        >
                            <span className="hidden min-w-0 text-right sm:block">
                                <span className="block max-w-40 truncate text-sm font-semibold">
                                    {displayName}
                                </span>

                                <span className="block max-w-40 truncate text-xs text-muted-foreground">
                                    {user.email}
                                </span>
                            </span>

                            <ProfileAvatar
                                src={user.avatarUrl}
                                initials={initials}

                            />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            align="end"
                            className="w-64 max-w-[calc(100vw-2rem)]"
                        >
                            <div className="flex items-center gap-3 px-2 py-3">
                                <ProfileAvatar
                                    src={user.avatarUrl}
                                    initials={initials}
                                    size={40}
                                />

                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">
                                        {displayName}
                                    </p>

                                    <p className="truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </p>
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

            {errorMessage && (
                <div className="mx-auto max-w-7xl px-6 pb-3 sm:px-10">
                    <p
                        role="alert"
                        className="text-sm text-destructive"
                    >
                        {errorMessage}
                    </p>
                </div>
            )}
        </header>
    );
}