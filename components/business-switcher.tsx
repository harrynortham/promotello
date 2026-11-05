"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCheck, FiChevronDown, FiPlus } from "react-icons/fi";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BusinessInitial } from "@/components/business-initial";

type Business = {
    id: string;
    name: string;
    approval_status: string;
};

type BusinessSwitcherProps = {
    currentBusinessId: string;
    businesses: Business[];
};

export function BusinessSwitcher({
    currentBusinessId,
    businesses,
}: BusinessSwitcherProps) {
    const pathname = usePathname();

    const currentBusiness =
        businesses.find((business) => business.id === currentBusinessId) ??
        businesses[0];

    if (!currentBusiness) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        className="h-auto w-full cursor-pointer justify-between gap-2 border-[#17233B]/15 py-2 pl-2 text-[#17233B] hover:bg-[#17233B]/[0.04] data-popup-open:bg-[#17233B]/[0.04]"
                    />
                }
            >
                <span className="flex min-w-0 items-center gap-2.5">
                    <BusinessInitial name={currentBusiness.name} current />
                    <span className="truncate text-sm font-medium">{currentBusiness.name}</span>
                </span>

                <FiChevronDown aria-hidden="true" className="size-4 shrink-0 text-[#17233B]/55" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" sideOffset={6} className="w-64">
                {/* The heading is a group part, so it has to sit inside one. */}
                <DropdownMenuGroup>
                    {businesses.length > 1 && <DropdownMenuLabel>Your businesses</DropdownMenuLabel>}

                    {businesses.map((business) => {
                        const href = `/business/${business.id}`;
                        const isCurrent = pathname.startsWith(href);

                        return (
                            <DropdownMenuItem
                                key={business.id}
                                render={<Link href={href} />}
                                className={isCurrent ? "font-semibold text-[#17233B]" : ""}
                            >
                                <BusinessInitial name={business.name} current={isCurrent} />
                                <span className="truncate">{business.name}</span>

                                {isCurrent && (
                                    <FiCheck aria-hidden="true" className="ml-auto size-4 text-[#FF593F]" />
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem render={<Link href="/onboarding" />}>
                    <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#17233B]/[0.06] text-[#17233B]/70 transition-colors group-focus/dropdown-menu-item:bg-[#FF593F]/10 group-focus/dropdown-menu-item:text-[#FF593F]"
                    >
                        <FiPlus className="size-4" />
                    </span>
                    Add a business
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
