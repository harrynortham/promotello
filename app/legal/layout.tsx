import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const policyLinks = [
    { label: "Privacy policy", href: "/legal/privacy" },
    { label: "Terms of service", href: "/legal/terms" },
    { label: "Cookie policy", href: "/legal/cookies" },
];

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <header className="border-b">
                <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10">
                    <Link
                        href="/"
                        aria-label="Promotello home"
                        className="shrink-0"
                    >
                        <Image
                            src="/brand/promotello-horizontal-primary.svg"
                            alt="Promotello"
                            width={160}
                            height={43}
                            priority
                        />
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button
                            render={<Link href="/" />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            For customers
                        </Button>

                        <Button
                            render={<Link href="/business" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            For businesses
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex-1">{children}</div>

            <footer className="border-t bg-muted/30">
                <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
                    <div className="flex flex-col justify-between gap-8 sm:flex-row">
                        <div>
                            <p className="font-semibold">Promotello</p>

                            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                                Information about using our platform and how
                                we handle your data.
                            </p>
                        </div>

                        <nav
                            aria-label="Legal footer navigation"
                            className="flex flex-wrap items-start gap-x-6 gap-y-3 text-sm"
                        >
                            {policyLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                >
                                    {link.label}
                                </Link>
                            ))}

                            <Link
                                href="/contact"
                                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                                Contact
                            </Link>
                        </nav>
                    </div>
                </div>
            </footer>
        </div>
    );
}