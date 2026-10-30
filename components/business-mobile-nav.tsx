"use client";

import Image from "next/image";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";

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
    businessLogoUrl?: string | null;
    approvalStatus: string;
    canManage: boolean;
    businesses?: Business[];
};

export function BusinessMobileNav({
    businessId,
    businessName,
    businessLogoUrl,
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
            label: "Offers",
            href: `/business/${businessId}/offers`,
        },
        {
            label: "Redemptions",
            href: `/business/${businessId}/redemptions`,
        },
        {
            label: "QR posters",
            href: `/business/${businessId}/qr`,
        },
        {
            label: "Loyalty card",
            href: `/business/${businessId}/loyalty`,
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
                {/* Right padding keeps the name clear of the close button. */}
                <SheetHeader className="pr-12">
                    <div className="flex min-w-0 items-center gap-3">
                        {businessLogoUrl ? (
                            <Image
                                src={businessLogoUrl}
                                alt=""
                                width={40}
                                height={40}
                                className="size-10 shrink-0 rounded-xl border border-[#17233B]/10 object-cover"
                            />
                        ) : (
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E8] font-semibold text-[#FF593F]">
                                {businessName.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <SheetTitle className="truncate">{businessName}</SheetTitle>
                    </div>
                </SheetHeader>

                <div className="space-y-5 overflow-y-auto px-4 pb-6">
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

                    <div className="space-y-2">
                        {/* With one business, the dashboard is its overview. */}
                        {businesses.length > 1 && (
                            <Button
                                render={<Link href="/business/dashboard" />}
                                nativeButton={false}
                                variant="outline"
                                className="w-full"
                            >
                                Go to dashboard
                            </Button>
                        )}

                        <Button
                            render={<Link href="/onboarding" />}
                            nativeButton={false}
                            variant="ghost"
                            className="w-full"
                        >
                            <FiPlus aria-hidden="true" />
                            Add a business
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}