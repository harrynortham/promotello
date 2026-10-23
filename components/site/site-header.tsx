"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "./use-current-user";
import { UserMenu } from "./user-menu";

export type HeaderLink = { label: string; href: string };

export type HeaderAction = {
    label: string;
    href: string;
    primary?: boolean;
    mobileLabel?: string;
};

export type SiteHeaderProps = {
    homeHref: string;
    links: HeaderLink[];
    // Buttons shown to signed-out visitors.
    signedOutActions: HeaderAction[];
    // Where the inline nav collapses into the menu button.
    collapseBelow?: "md" | "lg";
    signOutRedirect?: string;
    variant?: "marketing" | "app";
};

const breakpoints = {
    md: { show: "md:flex", hide: "md:hidden" },
    lg: { show: "lg:flex", hide: "lg:hidden" },
};

// Reading the URL (for the active link) needs a Suspense boundary under
// cacheComponents, so the header provides its own with a same-height
// placeholder; layouts don't need to wrap it.
export function SiteHeader(props: SiteHeaderProps) {
    return (
        <Suspense
            fallback={
                <div
                    className={`sticky top-0 z-50 h-20 bg-background/95 ${props.variant === "app" ? "border-b border-border" : ""}`}
                />
            }
        >
            <HeaderContent {...props} />
        </Suspense>
    );
}

function HeaderContent({
    homeHref,
    links,
    signedOutActions,
    collapseBelow = "md",
    signOutRedirect = "/",
    variant = "marketing",
}: SiteHeaderProps) {
    const pathname = usePathname();
    const { user, isLoading } = useCurrentUser();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const bp = breakpoints[collapseBelow];
    const hasMobileMenu = links.length > 0 || (!user && !isLoading);

    function isActive(href: string) {
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    return (
        <header
            className={`sticky top-0 z-50 px-6 backdrop-blur-md ${variant === "app" ? "border-b border-border bg-background/95" : "bg-background/95"}`}
        >
            <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between gap-4">
                <Link href={homeHref} aria-label="Promotello home" className="shrink-0">
                    <Image
                        src="/brand/promotello-horizontal-primary.svg"
                        alt="Promotello"
                        width={180}
                        height={48}
                        priority
                        className="h-auto w-36 sm:w-44"
                    />
                </Link>

                {links.length > 0 && (
                    <nav
                        aria-label="Primary navigation"
                        className={`absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 ${bp.show}`}
                    >
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(link.href) ? "page" : undefined}
                                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive(link.href)
                                    ? "bg-[#FF593F]/10 text-[#17233B]"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                )}

                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <div className="h-10 w-10 animate-pulse rounded-full bg-muted sm:w-28" />
                    ) : user ? (
                        <UserMenu user={user} signOutRedirect={signOutRedirect} />
                    ) : (
                        <div className={`hidden items-center gap-2 ${bp.show}`}>
                            {signedOutActions.map((action) => (
                                <Button
                                    key={action.href}
                                    render={<Link href={action.href} />}
                                    nativeButton={false}
                                    variant={action.primary ? "default" : "ghost"}
                                    size={action.primary ? "lg" : "default"}
                                >
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    )}

                    {hasMobileMenu && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={bp.hide}
                            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                            aria-controls="mobile-menu"
                            aria-expanded={isMenuOpen}
                            onClick={() => setIsMenuOpen((open) => !open)}
                        >
                            {isMenuOpen ? (
                                <FiX className="size-6" aria-hidden="true" />
                            ) : (
                                <FiMenu className="size-6" aria-hidden="true" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {hasMobileMenu && (
                <nav
                    id="mobile-menu"
                    aria-label="Mobile navigation"
                    className={`${isMenuOpen ? "block" : "hidden"} -mx-6 border-t border-border bg-background px-5 pb-5 pt-3 ${bp.hide}`}
                >
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={isActive(link.href) ? "page" : undefined}
                            onClick={() => setIsMenuOpen(false)}
                            className={`block rounded-full px-3 py-3 text-sm font-medium ${isActive(link.href)
                                ? "bg-[#FF593F]/10 text-[#17233B]"
                                : "text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}

                    {!user && !isLoading && signedOutActions.length > 0 && (
                        <div className="mt-4 space-y-3 border-t border-border pt-4">
                            {[...signedOutActions]
                                .sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)))
                                .map((action) => (
                                    <Button
                                        key={action.href}
                                        render={<Link href={action.href} />}
                                        nativeButton={false}
                                        variant={action.primary ? "default" : "outline"}
                                        size="lg"
                                        className="w-full"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {action.mobileLabel ?? action.label}
                                    </Button>
                                ))}
                        </div>
                    )}
                </nav>
            )}
        </header>
    );
}
