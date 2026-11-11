"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { FiArrowRight, FiMenu, FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCurrentUser } from "./use-current-user";
import { useRunsABusiness } from "./use-runs-a-business";
import { navIcons, type NavIconName } from "./nav-icons";
import { UserMenu, type AccountArea } from "./user-menu";

// With an icon, a link shows it to the left of its label.
export type HeaderLink = { label: string; href: string; icon?: NavIconName };

// needsBusiness: a line about "your business" is only true for somebody
// who runs one. Without it the menu falls back to the signed-out line,
// or to nothing where there isn't one.
export type MenuFooter = { text: string; label: string; href: string; needsBusiness?: boolean };

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
    // Which account links the avatar menu shows.
    accountArea?: AccountArea;
    // A quiet line at the bottom of the mobile menu, for the audience this
    // header is not built for. On customer pages that is a business owner,
    // who otherwise has to reach the footer to find there is a business side.
    menuFooter?: MenuFooter;
    // What that line says once you're signed in, when the pitch no longer
    // fits: your own pages, which are otherwise only behind the avatar.
    signedInMenuFooter?: MenuFooter;
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
    accountArea = "customer",
    menuFooter,
    signedInMenuFooter,
}: SiteHeaderProps) {
    const pathname = usePathname();
    const { user, isLoading } = useCurrentUser();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const bp = breakpoints[collapseBelow];
    const hasMobileMenu = links.length > 0 || (!user && !isLoading);

    const runsABusiness = useRunsABusiness();

    function isActive(href: string) {
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    // Who the line at the bottom of the menu is for depends on whether
    // anyone is signed in, so it waits for that to be known rather than
    // offering the wrong one first. Never a link to the page you're on.
    let footer = isLoading ? undefined : user ? signedInMenuFooter : menuFooter;
    if (footer?.needsBusiness && !runsABusiness) footer = menuFooter;
    if (footer && pathname === footer.href) footer = undefined;

    return (
        <header
            className={`sticky top-0 z-50 px-6 backdrop-blur-md print:hidden ${variant === "app" ? "border-b border-border bg-background/95" : "bg-background/95"}`}
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
                        {links.map((link) => {
                            const Icon = link.icon ? navIcons[link.icon] : null;
                            const active = isActive(link.href);

                            return Icon ? (
                                // Icon beside the label, with a bar under the current page.
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`group relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${active ? "text-[#17233B]" : "text-[#17233B]/65 hover:text-[#17233B]"}`}
                                >
                                    <Icon className="size-6 transition-transform duration-200 group-hover:scale-110" />
                                    {link.label}
                                    <span
                                        aria-hidden="true"
                                        className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#17233B] transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                                    />
                                </Link>
                            ) : (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${active
                                        ? "bg-[#FF593F]/10 text-[#17233B]"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                )}

                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <div className="h-10 w-10 animate-pulse rounded-full bg-muted sm:w-28" />
                    ) : user ? (
                        <UserMenu user={user} signOutRedirect={signOutRedirect} area={accountArea} />
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
                        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                            <SheetTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={bp.hide}
                                        aria-label="Open menu"
                                    />
                                }
                            >
                                <FiMenu className="size-6" aria-hidden="true" />
                            </SheetTrigger>

                            <SheetContent side="right" className="w-[min(22rem,88vw)] gap-0 p-0" showCloseButton={false}>
                                {/* One row: the close sits on the logo's
                                    line, the size of the button that
                                    opened the menu. */}
                                <SheetHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
                                    <SheetTitle className="sr-only">Menu</SheetTitle>
                                    <Image
                                        src="/brand/promotello-horizontal-primary.svg"
                                        alt="Promotello"
                                        width={140}
                                        height={37}
                                        className="h-auto w-32"
                                    />

                                    <SheetClose
                                        aria-label="Close menu"
                                        className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-[#17233B]/65 transition hover:bg-[#17233B]/5 hover:text-[#17233B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]"
                                    >
                                        <FiX aria-hidden="true" className="size-6" />
                                    </SheetClose>
                                </SheetHeader>

                                <nav aria-label="Mobile navigation" className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
                                    {links.map((link) => {
                                        const Icon = link.icon ? navIcons[link.icon] : null;

                                        return (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                aria-current={isActive(link.href) ? "page" : undefined}
                                                onClick={() => setIsMenuOpen(false)}
                                                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium ${isActive(link.href)
                                                    ? "bg-[#FF593F]/10 text-[#17233B]"
                                                    : "text-slate-700 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {Icon && <Icon className="size-7 shrink-0" />}
                                                {link.label}
                                            </Link>
                                        );
                                    })}

                                    {!user && !isLoading && signedOutActions.length > 0 && (
                                        <div className="mt-auto space-y-3 border-t border-border px-2 pt-5">
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

                                    {footer && (
                                        <div
                                            className={`border-t border-border px-3 pt-5 ${
                                                !user && !isLoading && signedOutActions.length > 0 ? "mt-5" : "mt-auto"
                                            }`}
                                        >
                                            <p className="text-sm text-slate-600">{footer.text}</p>
                                            <Link
                                                href={footer.href}
                                                onClick={() => setIsMenuOpen(false)}
                                                className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#FF593F] hover:underline"
                                            >
                                                {footer.label}
                                                <FiArrowRight aria-hidden="true" className="size-4" />
                                            </Link>
                                        </div>
                                    )}
                                </nav>
                            </SheetContent>
                        </Sheet>
                    )}
                </div>
            </div>
        </header>
    );
}
