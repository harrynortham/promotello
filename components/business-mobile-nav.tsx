"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { BusinessSidebarNav } from "@/components/business-sidebar-nav";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { BusinessInitial } from "@/components/business-initial";
import { BusinessPageLink } from "@/components/business-page-link";
import { storedImage } from "@/lib/images";

type Business = {
    id: string;
    name: string;
    approval_status: string;
};

type BusinessMobileNavProps = {
    businessId: string;
    businessName: string;
    businessSlug: string;
    businessLogoUrl?: string | null;
    approvalStatus: string;
    reviewRequested: boolean;
    canManage: boolean;
    businesses?: Business[];
};

export function BusinessMobileNav({
    businessId,
    businessName,
    businessSlug,
    businessLogoUrl,
    approvalStatus,
    reviewRequested,
    canManage,
    businesses = [],
}: BusinessMobileNavProps) {
    const [open, setOpen] = useState(false);

    // Any link in the menu closes it, so the new page isn't hidden behind it.
    function closeOnLink(event: MouseEvent<HTMLDivElement>) {
        if ((event.target as HTMLElement).closest("a")) setOpen(false);
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
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
                showCloseButton={false}
            >
                <SheetHeader className="flex-row items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        {storedImage(businessLogoUrl) ? (
                            <Image
                                src={storedImage(businessLogoUrl)!}
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
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <SheetTitle className="truncate">{businessName}</SheetTitle>

                                <BusinessPageLink business={{ name: businessName, slug: businessSlug }} />
                            </div>

                            <BusinessStatusBadge
                                status={approvalStatus}
                                reviewRequested={reviewRequested}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {/* On the same line as the name, and the size of the
                        button that opened it. */}
                    <SheetClose
                        aria-label="Close menu"
                        className="-mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-[#17233B]/65 transition hover:bg-[#17233B]/5 hover:text-[#17233B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]"
                    >
                        <FiX aria-hidden="true" className="size-6" />
                    </SheetClose>
                </SheetHeader>

                <div className="space-y-5 overflow-y-auto px-4 pb-6" onClick={closeOnLink}>
                    {businesses.length > 1 && (
                        <>
                            <div>
                                <p className="mb-2 text-sm font-semibold text-[#17233B]">
                                    Switch business
                                </p>

                                <div className="space-y-1">
                                    {businesses.map((business) => {
                                        const isCurrent = business.id === businessId;

                                        return (
                                            <Button
                                                key={business.id}
                                                render={
                                                    <Link
                                                        href={`/business/${business.id}`}
                                                    />
                                                }
                                                nativeButton={false}
                                                variant={isCurrent ? "secondary" : "ghost"}
                                                className={
                                                    isCurrent
                                                        ? "h-11 w-full justify-start gap-3 bg-[#FF593F]/10 pl-2 font-semibold text-[#17233B] hover:bg-[#FF593F]/15"
                                                        : "h-11 w-full justify-start gap-3 pl-2 text-[#17233B]/70 hover:bg-[#17233B]/5 hover:text-[#17233B]"
                                                }
                                            >
                                                <BusinessInitial name={business.name} current={isCurrent} />

                                                <span className="truncate">
                                                    {business.name}
                                                </span>

                                                {isCurrent && (
                                                    <FiCheck
                                                        aria-hidden="true"
                                                        className="ml-auto size-4 text-[#FF593F]"
                                                    />
                                                )}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>

                            <Separator />
                        </>
                    )}

                    {/* The same links, order and highlight as the desktop side menu. */}
                    <BusinessSidebarNav businessId={businessId} canManage={canManage} />

                    <Separator />

                    <FeedbackDialog businessId={businessId} />

                    <Separator />

                    <div className="space-y-2">
                        <Button
                            render={<Link href="/business/setup/new" />}
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