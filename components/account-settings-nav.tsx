"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FiBell,
    FiGrid,
    FiLock,
    FiShield,
    FiUser,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";

const links = [
    {
        label: "Overview",
        href: "/account",
        icon: FiGrid,
    },
    {
        label: "Profile",
        href: "/account/profile",
        icon: FiUser,
    },
    {
        label: "Security",
        href: "/account/security",
        icon: FiLock,
    },
    {
        label: "Notifications",
        href: "/account/notifications",
        icon: FiBell,
    },
    {
        label: "Privacy",
        href: "/account/privacy",
        icon: FiShield,
    },
];

export default function AccountSettingsNav() {
    const pathname = usePathname();

    return (
        <nav aria-label="Account settings">
            <p className="mb-4 hidden px-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:block">
                Your account
            </p>

            <div className="-mx-6 overflow-x-auto overscroll-x-contain px-6 pb-3 sm:-mx-10 sm:px-10 lg:mx-0 lg:overflow-visible lg:p-0">
                <ul className="flex w-max gap-2 lg:w-full lg:flex-col">
                    {links.map((link) => {
                        const Icon = link.icon;

                        const isActive =
                            link.href === "/account"
                                ? pathname === link.href
                                : pathname === link.href ||
                                pathname.startsWith(`${link.href}/`);

                        return (
                            <li key={link.href}>
                                <Button
                                    render={
                                        <Link
                                            href={link.href}
                                            aria-current={
                                                isActive ? "page" : undefined
                                            }
                                        />
                                    }
                                    nativeButton={false}
                                    variant={
                                        isActive ? "secondary" : "ghost"
                                    }
                                    className="justify-start whitespace-nowrap lg:w-full"
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-4 shrink-0"
                                    />
                                    {link.label}
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}