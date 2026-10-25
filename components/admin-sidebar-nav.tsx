"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FiAlertTriangle,
    FiBarChart2,
    FiBriefcase,
    FiFileText,
    FiGift,
    FiMapPin,
    FiSend,
    FiTag,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";

const links = [
    { label: "Overview", href: "/admin", icon: FiBarChart2 },
    { label: "Businesses", href: "/admin/businesses", icon: FiBriefcase, count: "businesses" },
    { label: "Promotions", href: "/admin/offers", icon: FiGift, count: "offers" },
    { label: "Categories", href: "/admin/categories", icon: FiTag },
    { label: "Previews", href: "/admin/previews", icon: FiSend },
    { label: "Cities and areas", href: "/admin/cities", icon: FiMapPin },
    { label: "Billing alerts", href: "/admin/billing", icon: FiAlertTriangle, count: "billing" },
    { label: "Audit log", href: "/admin/audit-logs", icon: FiFileText },
] as const;

export type AdminNavCounts = {
    businesses: number;
    offers: number;
    billing: number;
};

// Sidebar for /admin, matching the account settings navigation.
export function AdminSidebarNav({ counts }: { counts: AdminNavCounts }) {
    const pathname = usePathname();

    return (
        <nav aria-label="Platform admin">
            <p className="mb-4 hidden px-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:block">
                Platform admin
            </p>

            <div className="-mx-6 overflow-x-auto overscroll-x-contain px-6 pb-3 sm:-mx-10 sm:px-10 lg:mx-0 lg:overflow-visible lg:p-0">
                <ul className="flex w-max gap-2 lg:w-full lg:flex-col">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const count = "count" in link ? counts[link.count] : 0;
                        const isActive =
                            link.href === "/admin"
                                ? pathname === link.href
                                : pathname === link.href || pathname.startsWith(`${link.href}/`);

                        return (
                            <li key={link.href}>
                                <Button
                                    render={
                                        <Link href={link.href} aria-current={isActive ? "page" : undefined} />
                                    }
                                    nativeButton={false}
                                    variant={isActive ? "secondary" : "ghost"}
                                    className="justify-start whitespace-nowrap lg:w-full"
                                >
                                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                                    {link.label}
                                    {count > 0 && (
                                        <span
                                            className="ml-auto rounded-full bg-[#C8371D] px-1.5 text-xs font-semibold leading-5 text-white"
                                            aria-label={`${count} waiting`}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}
