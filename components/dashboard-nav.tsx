"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { FiAward, FiGrid, FiTag } from "react-icons/fi";

const links = [
    { label: "Dashboard", href: "/dashboard", icon: FiGrid },
    { label: "My vouchers", href: "/dashboard/redemptions", icon: FiTag },
    { label: "Loyalty cards", href: "/dashboard/loyalty", icon: FiAward },
];

// Reading the URL (for the page you're on) needs a Suspense boundary under
// cacheComponents, or a page that prerenders — a voucher, say — fails the
// build. The row provides its own, with a gap its own height so nothing
// jumps when it arrives.
export function DashboardNav() {
    return (
        <Suspense fallback={<div aria-hidden="true" className="mb-7 h-[46px] lg:hidden" />}>
            <Pills />
        </Suspense>
    );
}

// A row of pills across the top of the customer area on a phone, so the
// other pages are one tap away rather than behind the avatar. On a wider
// screen the account menu is plain enough to find, and the row would only
// repeat it.
//
// Account settings is not here on purpose: it has its own row of pills, so
// a pill leading there would be swapped for a row that cannot come back.
function Pills() {
    const pathname = usePathname();
    const strip = useRef<HTMLDivElement>(null);
    const current = useRef<HTMLAnchorElement>(null);

    // The last pills sit off the right of a narrow screen, so bring the page
    // you're on into the middle rather than leaving it out of sight.
    useEffect(() => {
        const row = strip.current;
        const pill = current.current;
        if (!row || !pill) return;

        const rowBox = row.getBoundingClientRect();
        const pillBox = pill.getBoundingClientRect();
        row.scrollLeft += pillBox.left - rowBox.left - (rowBox.width - pillBox.width) / 2;
    }, [pathname]);

    return (
        <nav aria-label="Your account pages" className="mb-7 lg:hidden">
            {/* Pulled out to the page's edges so the row scrolls past them
                rather than stopping short inside the padding. */}
            <div
                ref={strip}
                className="-mx-6 overflow-x-auto overscroll-x-contain px-6 pb-2 sm:-mx-10 sm:px-10"
            >
                <ul className="flex w-max gap-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        // Everything lives under /dashboard, so the first
                        // pill is only current on the page itself.
                        const isActive =
                            link.href === "/dashboard"
                                ? pathname === link.href
                                : pathname === link.href || pathname.startsWith(`${link.href}/`);

                        return (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    ref={isActive ? current : undefined}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${isActive
                                        ? "border-[#FF593F]/25 bg-[#FF593F]/10 font-semibold text-[#17233B]"
                                        : "border-[#17233B]/10 bg-white font-medium text-[#17233B]/75 hover:border-[#17233B]/30 hover:text-[#17233B]"
                                        }`}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className={isActive ? "size-4 shrink-0 text-[#FF593F]" : "size-4 shrink-0 text-[#17233B]/55"}
                                    />
                                    {link.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}
