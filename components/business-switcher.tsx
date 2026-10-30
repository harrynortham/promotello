"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiPlus } from "react-icons/fi";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
                        className="w-full cursor-pointer justify-between"
                    />
                }
            >
                <span className="truncate">{currentBusiness.name}</span>
                <span className="ml-2 text-xs">⌄</span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-60">
                {businesses.map((business) => {
                    const href = `/business/${business.id}`;
                    const isCurrent = pathname.startsWith(href);

                    return (
                        <DropdownMenuItem
                            key={business.id}
                            render={<Link href={href} />}
                            className={isCurrent ? "bg-muted font-semibold" : ""}
                        >
                            <span className="truncate">{business.name}</span>
                        </DropdownMenuItem>
                    );
                })}

                <DropdownMenuSeparator />

                <DropdownMenuItem render={<Link href="/onboarding" />}>
                    <FiPlus aria-hidden="true" />
                    Add a business
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}