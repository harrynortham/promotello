"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FiAward,
    FiBarChart2,
    FiCalendar,
    FiCheckCircle,
    FiCreditCard,
    FiHome,
    FiPrinter,
    FiSettings,
    FiShoppingBag,
    FiTag,
    FiUsers,
    FiZap,
} from "react-icons/fi";
import type { IconType } from "react-icons";

import { Button } from "@/components/ui/button";
import { EVENTS_ENABLED } from "@/lib/features";

type BusinessSidebarNavProps = {
    businessId: string;
    canManage: boolean;
};

type SidebarLink = { label: string; path: string; icon: IconType };

const overviewLink: SidebarLink = {
    label: "Overview",
    path: "",
    icon: FiHome,
};

const baseLinks: SidebarLink[] = [
    {
        label: "Offers",
        path: "/offers",
        icon: FiTag,
    },
    {
        label: "QR posters",
        path: "/qr",
        icon: FiPrinter,
    },
    {
        label: "Loyalty card",
        path: "/loyalty",
        icon: FiAward,
    },
    {
        label: "Automations",
        path: "/automations",
        icon: FiZap,
    },
    {
        label: "Redemptions",
        path: "/redemptions",
        icon: FiCheckCircle,
    },
    ...(EVENTS_ENABLED ? [{ label: "Events", path: "/events", icon: FiCalendar }] : []),
    {
        label: "Analytics",
        path: "/analytics",
        icon: FiBarChart2,
    },
];

export function BusinessSidebarNav({
    businessId,
    canManage,
}: BusinessSidebarNavProps) {
    const pathname = usePathname();

    const links: SidebarLink[] = [
        overviewLink,
        ...(canManage
            ? [
                {
                    label: "Business profile",
                    path: "/edit",
                    icon: FiShoppingBag,
                },
            ]
            : []),
        ...baseLinks,
        ...(canManage
            ? [
                {
                    label: "Team",
                    path: "/team",
                    icon: FiUsers,
                },
                {
                    label: "Settings",
                    path: "/settings",
                    icon: FiSettings,
                },
                {
                    label: "Billing",
                    path: "/billing",
                    icon: FiCreditCard,
                },
            ]
            : []),
    ];

    return (
        <nav className="space-y-1">
            {links.map((link) => {
                const href = `/business/${businessId}${link.path}`;
                const isActive =
                    link.path === ""
                        ? pathname === href
                        : pathname === href ||
                        pathname.startsWith(`${href}/`);
                const Icon = link.icon;

                return (
                    <Button
                        key={href}
                        render={<Link href={href} />}
                        nativeButton={false}
                        variant={isActive ? "secondary" : "ghost"}
                        className={
                            isActive
                                ? "h-9 w-full justify-start gap-3 bg-[#FF593F]/10 font-semibold text-[#17233B] hover:bg-[#FF593F]/15"
                                : "h-9 w-full justify-start gap-3 text-[#17233B]/70 hover:bg-[#17233B]/5 hover:text-[#17233B]"
                        }
                    >
                        {/* The label says what it is; the icon is there to
                            find the row again at a glance. */}
                        <Icon
                            aria-hidden="true"
                            className={isActive ? "size-4 text-[#FF593F]" : "size-4 text-[#17233B]/50"}
                        />
                        {link.label}
                    </Button>
                );
            })}

        </nav>
    );
}
