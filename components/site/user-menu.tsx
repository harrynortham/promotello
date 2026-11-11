"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import {
    FiAward,
    FiBell,
    FiBriefcase,
    FiCompass,
    FiGrid,
    FiLogOut,
    FiSettings,
    FiShield,
    FiTag,
} from "react-icons/fi";
import type { IconType } from "react-icons";

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
import { useRunsABusiness } from "./use-runs-a-business";
import { useUnreadNotifications } from "./use-unread-notifications";
import { UserAvatar } from "./user-avatar";

type AccountLink = {
    label: string;
    href: string;
    icon: IconType;
    // Shown only to somebody who runs a business. A customer who signed
    // up to claim an offer has no business dashboard to go to, and a
    // link to one reads as something they have forgotten to set up.
    needsBusiness?: boolean;
    // Carries the unread count at the right of the row.
    unread?: boolean;
};

// The same account links everywhere, so users always know where to find
// them. Each inner array is a group with a divider between: what you came
// for first, then the other side of the marketplace, then your account.
const accountLinks = {
    customer: [
        [
            { label: "Dashboard", href: "/dashboard", icon: FiGrid },
            { label: "My vouchers", href: "/dashboard/redemptions", icon: FiTag },
            { label: "Loyalty cards", href: "/dashboard/loyalty", icon: FiAward },
        ],
        [{ label: "Business dashboard", href: "/business/dashboard", icon: FiBriefcase, needsBusiness: true }],
        [
            { label: "Notifications", href: "/notifications", icon: FiBell, unread: true },
            { label: "Account settings", href: "/account", icon: FiSettings },
        ],
    ],
    // In the business dashboard, the customer side is one link, not three.
    business: [
        [{ label: "Business dashboard", href: "/business/dashboard", icon: FiBriefcase }],
        [{ label: "Customer area", href: "/dashboard", icon: FiCompass }],
        [
            { label: "Notifications", href: "/notifications", icon: FiBell, unread: true },
            { label: "Account settings", href: "/account", icon: FiSettings },
        ],
    ],
} satisfies Record<string, AccountLink[][]>;

export type AccountArea = keyof typeof accountLinks;

// Platform admins also get a link to /admin. The check runs once per menu
// and only grants a link: /admin itself enforces access.
function useIsPlatformAdmin() {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let isMounted = true;

        createClient()
            .rpc("is_platform_admin")
            .then(({ data }) => {
                if (isMounted) setIsAdmin(data === true);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return isAdmin;
}

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

// An icon in its own tile, which picks up the brand's coral as the row is
// hovered or keyboard-focused. Plain icons beside text read as clutter at
// this size; a tile gives the column some rhythm.
function MenuIcon({ icon: Icon }: { icon: IconType }) {
    return (
        <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#17233B]/[0.06] text-[#17233B]/70 transition-colors group-focus/dropdown-menu-item:bg-[#FF593F]/10 group-focus/dropdown-menu-item:text-[#FF593F]"
        >
            <Icon className="size-4" />
        </span>
    );
}

// Avatar button with a dropdown of account links, for desktop headers.
export function UserMenu({
    user,
    signOutRedirect = "/",
    area = "customer",
}: {
    user: UserProfile;
    area?: AccountArea;
    signOutRedirect?: string;
}) {
    const { signOut, isSigningOut, error } = useSignOut(signOutRedirect);
    const isAdmin = useIsPlatformAdmin();
    const runsABusiness = useRunsABusiness();
    const unread = useUnreadNotifications();

    // A group that empties out goes with its divider, rather than
    // leaving a line with nothing under it.
    const groups = (accountLinks[area] as AccountLink[][])
        .map((group) => group.filter((link) => !link.needsBusiness || runsABusiness))
        .filter((group) => group.length > 0);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        type="button"
                        variant="ghost"
                        aria-label={
                            unread > 0
                                ? `Open account menu for ${user.displayName}, ${unread} unread ${unread === 1 ? "notification" : "notifications"}`
                                : `Open account menu for ${user.displayName}`
                        }
                        className="h-auto cursor-pointer gap-3 rounded-full px-2 py-1.5 data-popup-open:bg-[#17233B]/[0.06]"
                    />
                }
            >
                {/* Only where there is room beside the navigation, which is
                    centred: at narrower widths the avatar stands alone. */}
                <span className="hidden min-w-0 text-right xl:block">
                    <span className="block max-w-40 truncate text-sm font-semibold text-[#17233B]">
                        {user.displayName}
                    </span>
                    <span className="block max-w-40 truncate text-xs text-[#17233B]/65">
                        {user.email}
                    </span>
                </span>

                {/* The dot says there is something, and the menu says
                    how many. Nothing is drawn until the count arrives,
                    so it never appears and then goes. The ring is the
                    header's own background, so it reads against a
                    photograph as well as a plain tile. */}
                <span className="relative flex">
                    <UserAvatar src={user.avatarUrl} initials={user.initials} />

                    {unread > 0 && (
                        <span
                            aria-hidden="true"
                            data-slot="unread-dot"
                            className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-[#FF593F] ring-2 ring-background"
                        />
                    )}
                </span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-72 max-w-[calc(100vw-2rem)]">
                {/* Who you're signed in as, on the brand's cream so the links
                    below it read as the list rather than more of the same. */}
                <div className="mb-1 flex min-w-0 items-center gap-3 rounded-xl bg-[#FFF8F0] px-3 py-3">
                    <UserAvatar src={user.avatarUrl} initials={user.initials} size={40} />

                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#17233B]">
                            {user.displayName}
                        </p>
                        <p className="truncate text-xs text-[#17233B]/60">{user.email}</p>
                    </div>
                </div>

                {groups.map((group, index) => (
                    <Fragment key={group[0].href}>
                        {index > 0 && <DropdownMenuSeparator />}

                        <DropdownMenuGroup>
                            {group.map((link) => (
                                <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                                    <MenuIcon icon={link.icon} />
                                    {link.label}

                                    {link.unread && unread > 0 && (
                                        <span
                                            data-slot="unread-count"
                                            className="ml-auto rounded-full bg-[#FF593F] px-2 py-0.5 text-xs font-semibold text-white"
                                        >
                                            {unread > 9 ? "9+" : unread}
                                        </span>
                                    )}
                                </DropdownMenuItem>
                            ))}

                            {/* Admins get their link with the account ones. */}
                            {index === groups.length - 1 && isAdmin && (
                                <DropdownMenuItem render={<Link href="/admin" />}>
                                    <MenuIcon icon={FiShield} />
                                    Platform admin
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuGroup>
                    </Fragment>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <DropdownMenuItem disabled={isSigningOut} onClick={signOut}>
                        <MenuIcon icon={FiLogOut} />
                        {isSigningOut ? "Signing out…" : "Sign out"}
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                {error && (
                    <p role="alert" className="px-3 pb-2 text-xs text-destructive">
                        {error}
                    </p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
