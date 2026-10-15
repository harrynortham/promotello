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

type BusinessMobileNavProps = {
    businessId: string;
    businessName: string;
    approvalStatus: string;
    canManage: boolean;
};

export function BusinessMobileNav({
    businessId,
    businessName,
    approvalStatus,
    canManage,
}: BusinessMobileNavProps) {
    return (
        <Sheet>
            <SheetTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        className="lg:hidden"
                    />
                }
            >
                Menu
            </SheetTrigger>

            <SheetContent
                side="left"
                className="w-80 bg-[#FFF8F0]"
            >
                <SheetHeader className="text-left">
                    <SheetTitle className="text-[#17233B]">
                        {businessName}
                    </SheetTitle>

                    <Badge
                        variant="outline"
                        className="w-fit capitalize"
                    >
                        {approvalStatus}
                    </Badge>
                </SheetHeader>

                <nav className="mt-8 flex flex-col gap-2">
                    <Button
                        render={<Link href={`/business/${businessId}`} />}
                        nativeButton={false}
                        variant="ghost"
                        className="justify-start"
                    >
                        Overview
                    </Button>

                    <Button
                        render={
                            <Link href={`/business/${businessId}/offers`} />
                        }
                        nativeButton={false}
                        variant="ghost"
                        className="justify-start"
                    >
                        Promotions
                    </Button>

                    <Button
                        render={
                            <Link
                                href={`/business/${businessId}/redemptions`}
                            />
                        }
                        nativeButton={false}
                        variant="ghost"
                        className="justify-start"
                    >
                        Redemptions
                    </Button>

                    {canManage && (
                        <>
                            <Button
                                render={
                                    <Link
                                        href={`/business/${businessId}/analytics`}
                                    />
                                }
                                nativeButton={false}
                                variant="ghost"
                                className="justify-start"
                            >
                                Analytics
                            </Button>

                            <Button
                                render={
                                    <Link href={`/business/${businessId}/team`} />
                                }
                                nativeButton={false}
                                variant="ghost"
                                className="justify-start"
                            >
                                Team
                            </Button>

                            <Button
                                render={
                                    <Link href={`/business/${businessId}/edit`} />
                                }
                                nativeButton={false}
                                variant="ghost"
                                className="justify-start"
                            >
                                Edit business
                            </Button>

                            <Button
                                render={
                                    <Link
                                        href={`/business/${businessId}/settings/notifications`}
                                    />
                                }
                                nativeButton={false}
                                variant="ghost"
                                className="justify-start"
                            >
                                Notifications
                            </Button>
                        </>
                    )}

                    <div className="my-4 h-px bg-[#17233B]/10" />

                    <Button
                        render={<Link href="/business/dashboard" />}
                        nativeButton={false}
                        variant="outline"
                    >
                        All businesses
                    </Button>

                    <Button
                        render={<Link href="/dashboard" />}
                        nativeButton={false}
                        variant="outline"
                    >
                        Customer area
                    </Button>
                </nav>
            </SheetContent>
        </Sheet>
    );
}