import Image from "next/image";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Button } from "@/components/ui/button";

const supportLinks = [
    { label: "Help centre", href: "/business/help" },
    { label: "Getting started", href: "/business/getting-started" },
    { label: "Contact support", href: "/business/contact" },
];

const legalLinks = [
    { label: "Privacy policy", href: "/legal/privacy" },
    { label: "Business terms", href: "/business/legal/terms" },
    { label: "Cookie policy", href: "/legal/cookies" },
];

export default function BusinessDashboardFooter() {
    return (
        <footer className="mt-auto border-t border-border bg-background text-foreground">
            <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
                <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                    <Link
                        href="/business/dashboard"
                        aria-label="Promotello business dashboard"
                        className="inline-flex w-fit shrink-0"
                    >
                        <Image
                            src="/brand/promotello-horizontal-primary.svg"
                            alt="Promotello"
                            width={150}
                            height={40}
                            className="h-auto max-w-full"
                        />
                    </Link>

                    <nav aria-label="Business support">
                        <ul className="flex flex-wrap gap-x-6 gap-y-3">
                            {supportLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <Button
                        render={<Link href="/dashboard" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        className="w-fit"
                    >
                        Customer area
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>

                <div className="mt-7 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        &copy; 2026 Promotello. All rights reserved.
                    </p>

                    <nav aria-label="Business dashboard legal information">
                        <ul className="flex flex-wrap gap-x-5 gap-y-3">
                            {legalLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </div>
        </footer>
    );
}