"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type Business = {
    id: string;
    name: string;
    approval_status: string;
};

type BusinessMobileNavProps = {
    businessId: string;
    businessName: string;
    approvalStatus: string;
    canManage: boolean;
    businesses?: Business[];
};

export function BusinessMobileNav({
    businessId,
    businessName,
    approvalStatus,
    canManage,
    businesses = [],
}: BusinessMobileNavProps) {
    const links = [
        {
            label: "Overview",
            href: `/business/${businessId}`,
        },
        {
            label: "Promotions",
            href: `/business/${businessId}/offers`,
        },
        {
            label: "Redemptions",
            href: `/business/${businessId}/redemptions`,
        },
        ...(canManage
            ? [
                {
                    label: "Analytics",
                    href: `/business/${businessId}/analytics`,
                },
                {
                    label: "Team",
                    href: `/business/${businessId}/team`,
                },
                {
                    label: "Edit business",
                    href: `/business/${businessId}/edit`,
                },
                {
                    label: "Notifications",
                    href: `/business/${businessId}/settings/notifications`,
                },
                {
                    label: "Billing",
                    href: `/business/${businessId}/billing`,
                },
            ]
            : []),
    ];

    return (
        <Sheet>
            <SheetTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                    />
                }
            >
                Menu
            </SheetTrigger>

            <SheetContent
                side="right"
                className="w-[min(22rem,90vw)]"
            >
                <SheetHeader>
                    <SheetTitle>{businessName}</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Current business
                        </p>

                        <p className="mt-2 truncate font-semibold text-[#17233B]">
                            {businessName}
                        </p>

                        <Badge
                            variant="outline"
                            className="mt-2 capitalize"
                        >
                            {approvalStatus}
                        </Badge>
                    </div>

                    {businesses.length > 1 && (
                        <>
                            <Separator />

                            <div>
                                <p className="mb-2 text-sm font-semibold text-[#17233B]">
                                    Switch business
                                </p>

                                <div className="space-y-1">
                                    {businesses.map((business) => (
                                        <Button
                                            key={business.id}
                                            render={
                                                <Link
                                                    href={`/business/${business.id}`}
                                                />
                                            }
                                            nativeButton={false}
                                            variant={
                                                business.id === businessId
                                                    ? "secondary"
                                                    : "ghost"
                                            }
                                            className="w-full justify-start"
                                        >
                                            <span className="truncate">
                                                {business.name}
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <Separator />

                    <nav className="space-y-1">
                        {links.map((link) => (
                            <Button
                                key={link.href}
                                render={<Link href={link.href} />}
                                nativeButton={false}
                                variant="ghost"
                                className="w-full justify-start"
                            >
                                {link.label}
                            </Button>
                        ))}
                    </nav>

                    <Separator />

                    <Button
                        render={<Link href="/business/dashboard" />}
                        nativeButton={false}
                        variant="outline"
                        className="w-full"
                    >
                        All businesses
                    </Button>

                    <Button
                        render={<Link href="/dashboard" />}
                        nativeButton={false}
                        variant="outline"
                        className="w-full"
                    >
                        Customer area
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}