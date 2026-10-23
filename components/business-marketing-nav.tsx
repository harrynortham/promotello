"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    avatarUrl: string;
};

const navigationLinks = [
    {
        label: "How it works",
        href: "/business/how-it-works",
    },
    {
        label: "Features",
        href: "/business/features",
    },
    {
        label: "Pricing",
        href: "/business/pricing",
    },
];

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

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();

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

            if (!isMounted) return;

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

        router.push("/");
    }

    function closeMobileMenu() {
        setIsMobileMenuOpen(false);
    }

    function isActiveLink(href: string) {
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    const displayName =
        user?.name || user?.email?.split("@")[0] || "Account";

    const initials = user ? getInitials(user.name, user.email) : "U";

    return (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md px-6 ">
            <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between">
                <Link href="/business" aria-label="Home">
                    <Image
                        src="/brand/promotello-horizontal-primary.svg"
                        alt="Promotello"
                        width={180}
                        height={48}
                        priority
                    />
                </Link>

                <nav
                    className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-4 lg:flex"
                    aria-label="Primary navigation"
                >
                    {navigationLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={
                                isActiveLink(link.href) ? "page" : undefined
                            }
                            className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActiveLink(link.href)
                                ? "bg-[#FF593F]/10 text-[#17233B]"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden lg:block">
                    {isLoading ? (
                        <div className="h-10 w-28 animate-pulse rounded-full bg-muted" />
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
                                <span className="text-right">
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
                                        render={
                                            <Link href="/business/dashboard" />
                                        }
                                    >
                                        Business dashboard
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        render={<Link href="/account" />}
                                    >
                                        Account settings
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
                        <div className="flex items-center gap-2">
                            <Button
                                render={<Link href="/login?next=/business/dashboard" />}
                                nativeButton={false}
                                variant="ghost"
                            >
                                Sign in
                            </Button>

                            <Button
                                render={
                                    <Link href="/business/register" />
                                }
                                nativeButton={false}
                                size="lg"
                            >
                                Get started
                            </Button>
                        </div>
                    )}
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label={
                        isMobileMenuOpen ? "Close menu" : "Open menu"
                    }
                    aria-controls="mobile-menu"
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
                id="mobile-menu"
                className={`${isMobileMenuOpen ? "block" : "hidden"
                    } border-t border-border bg-background px-5 pb-5 pt-3 lg:hidden`}
                aria-label="Mobile navigation"
            >
                {navigationLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={
                            isActiveLink(link.href) ? "page" : undefined
                        }
                        className={`block rounded-full px-3 py-3 text-sm font-medium ${isActiveLink(link.href)
                            ? "bg-[#FF593F]/10 text-[#17233B]"
                            : "text-slate-700 hover:bg-slate-50"
                            }`}
                        onClick={closeMobileMenu}
                    >
                        {link.label}
                    </Link>
                ))}

                {isLoading ? (
                    <div className="mt-4 h-12 animate-pulse rounded-xl bg-muted" />
                ) : user ? (
                    <div className="mt-3 border-t border-border pt-4">
                        <div className="flex items-center gap-3 px-3 pb-3">
                            <ProfilePhoto
                                src={user.avatarUrl}
                                initials={initials}
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

                        <Link
                            href="/business/dashboard"
                            className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={closeMobileMenu}
                        >
                            Business dashboard
                        </Link>

                        <Link
                            href="/account"
                            className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={closeMobileMenu}
                        >
                            Account settings
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
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                        <Button
                            render={
                                <Link href="/business/register" />
                            }
                            nativeButton={false}
                            size="lg"
                            className="w-full"
                            onClick={closeMobileMenu}
                        >
                            Get started
                        </Button>

                        <Button
                            render={<Link href="/login?next=/business/dashboard" />}
                            nativeButton={false}
                            variant="outline"
                            className="w-full"
                            onClick={closeMobileMenu}
                        >
                            Already registered? Sign in
                        </Button>
                    </div>
                )}
            </nav>
        </header>
    );
}