"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

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
};

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

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
                setUser({
                    email: user.email ?? "",
                    name:
                        user.user_metadata?.full_name ??
                        user.user_metadata?.name ??
                        "",
                });
            }

            setIsLoading(false);
        }

        loadUser();

        return () => {
            isMounted = false;
        };
    }, []);

    async function handleSignOut() {
        setIsSigningOut(true);

        const supabase = createClient();
        await supabase.auth.signOut();

        window.location.assign("/");
    }

    function closeMobileMenu() {
        setIsMobileMenuOpen(false);
    }

    const displayName =
        user?.name || user?.email?.split("@")[0] || "Account";

    const initials = user ? getInitials(user.name, user.email) : "U";

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
            <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
                <Link href="/" aria-label="Home">
                    <Image
                        src="/brand/promotello-horizontal-primary.svg"
                        alt="Promotello"
                        width={180}
                        height={48}
                        priority
                    />
                </Link>

                <nav
                    className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex"
                    aria-label="Primary navigation"
                >
                    <Link
                        href="/business/features"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                        Features
                    </Link>

                    <Link
                        href="/business/how-it-works"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                        How it works
                    </Link>

                    <Link
                        href="/business/pricing"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                        Pricing
                    </Link>
                </nav>

                <div className="hidden md:block">
                    {isLoading ? (
                        <div className="h-10 w-28 animate-pulse rounded-full bg-muted" />
                    ) : user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="flex h-auto items-center gap-3 rounded-full px-2 py-1.5"
                                    />
                                }
                            >
                                <span className="text-right">
                                    <span className="block text-sm font-semibold text-foreground">
                                        {displayName}
                                    </span>

                                    <span className="block max-w-40 truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </span>

                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17233B] text-sm font-semibold text-white">
                                    {initials}
                                </span>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                className="w-64"
                            >
                                <div className="px-2 py-2">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#17233B] text-sm font-semibold text-white">
                                            {initials}
                                        </span>

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
                                        Consumer dashboard
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
                            size="lg"
                            render={<Link href="/business/register" />}
                            nativeButton={false}
                        >
                            Sign up
                        </Button>
                    )}
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label={
                        isMobileMenuOpen ? "Close menu" : "Open menu"
                    }
                    aria-controls="business-mobile-menu"
                    aria-expanded={isMobileMenuOpen}
                    onClick={() =>
                        setIsMobileMenuOpen((isOpen) => !isOpen)
                    }
                >
                    {isMobileMenuOpen ? (
                        <FiX className="size-6" aria-hidden="true" />
                    ) : (
                        <FiMenu className="size-6" aria-hidden="true" />
                    )}
                </Button>
            </div>

            <nav
                id="business-mobile-menu"
                className={`${isMobileMenuOpen ? "block" : "hidden"
                    } border-t border-border bg-background px-5 pb-5 pt-3 md:hidden`}
                aria-label="Mobile navigation"
            >
                <Link
                    href="/business/features"
                    className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={closeMobileMenu}
                >
                    Features
                </Link>

                <Link
                    href="/business/how-it-works"
                    className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={closeMobileMenu}
                >
                    How it works
                </Link>

                <Link
                    href="/business/pricing"
                    className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={closeMobileMenu}
                >
                    Pricing
                </Link>

                {user ? (
                    <div className="mt-3 border-t border-border pt-4">
                        <div className="flex items-center gap-3 px-3 pb-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17233B] text-sm font-semibold text-white">
                                {initials}
                            </span>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                    {displayName}
                                </p>

                                <p className="truncate text-xs text-muted-foreground">
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/account"
                            className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={closeMobileMenu}
                        >
                            Account settings
                        </Link>

                        <Link
                            href="/business/dashboard"
                            className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={closeMobileMenu}
                        >
                            Business dashboard
                        </Link>

                        <Link
                            href="/dashboard"
                            className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={closeMobileMenu}
                        >
                            Consumer dashboard
                        </Link>

                        <Button
                            type="button"
                            variant="outline"
                            className="mt-2 w-full"
                            disabled={isSigningOut}
                            onClick={handleSignOut}
                        >
                            {isSigningOut ? "Signing out…" : "Sign out"}
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="lg"
                        render={<Link href="/business/register" />}
                        nativeButton={false}
                        className="mt-2 w-full"
                        onClick={closeMobileMenu}
                    >
                        Sign up
                    </Button>
                )}
            </nav>

            {isMobileMenuOpen && (
                <Button
                    type="button"
                    variant="ghost"
                    className="fixed inset-x-0 bottom-0 top-20 z-40 h-auto rounded-none bg-slate-950/5 backdrop-blur-xs md:hidden"
                    aria-label="Close menu"
                    onClick={closeMobileMenu}
                />
            )}
        </header>
    );
}