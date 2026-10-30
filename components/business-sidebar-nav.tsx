"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EVENTS_ENABLED } from "@/lib/features";

type BusinessSidebarNavProps = {
    businessId: string;
    canManage: boolean;
};

const baseLinks = [
    {
        label: "Overview",
        path: "",
    },
    {
        label: "Offers",
        path: "/offers",
    },
    {
        label: "Redemptions",
        path: "/redemptions",
    },
    {
        label: "QR posters",
        path: "/qr",
    },
    {
        label: "Loyalty card",
        path: "/loyalty",
    },
    {
        label: "Automations",
        path: "/automations",
    },
    ...(EVENTS_ENABLED ? [{ label: "Events", path: "/events" }] : []),
    {
        label: "Analytics",
        path: "/analytics",
    },
];

export function BusinessSidebarNav({
    businessId,
    canManage,
}: BusinessSidebarNavProps) {
    const pathname = usePathname();

    const links = [
        ...baseLinks,
        ...(canManage
            ? [
                {
                    label: "Team",
                    path: "/team",
                },
                {
                    label: "Edit business",
                    path: "/edit",
                },
                {
                    label: "Notifications",
                    path: "/settings/notifications",
                },
                {
                    label: "Billing",
                    path: "/billing",
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

                return (
                    <Button
                        key={href}
                        render={<Link href={href} />}
                        nativeButton={false}
                        variant={isActive ? "secondary" : "ghost"}
                        className={
                            isActive
                                ? "w-full justify-start bg-[#FF593F]/10 font-semibold text-[#17233B] hover:bg-[#FF593F]/15"
                                : "w-full justify-start text-[#17233B]/70 hover:bg-[#17233B]/5 hover:text-[#17233B]"
                        }
                    >
                        {link.label}
                    </Button>
                );
            })}

        </nav>
    );
}