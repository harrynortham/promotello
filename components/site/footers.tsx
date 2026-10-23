"use client";

import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiExternalLink } from "react-icons/fi";
import { SocialIcon } from "react-social-icons/component";
import "react-social-icons/x";
import "react-social-icons/facebook";
import "react-social-icons/youtube";
import "react-social-icons/linkedin";
import "react-social-icons/instagram";
import "react-social-icons/tiktok";

import { Button } from "@/components/ui/button";

type FooterLink = { label: string; href: string; external?: boolean };

const legalLinks: FooterLink[] = [
    { label: "Privacy policy", href: "/legal/privacy" },
    { label: "Terms of service", href: "/legal/terms" },
    { label: "Cookie policy", href: "/legal/cookies" },
    { label: "Cookie settings", href: "/legal/cookies#choices" },
];

const socialLinks = [
    { label: "X", network: "x", url: "https://x.com/promotello" },
    { label: "Facebook", network: "facebook", url: "https://www.facebook.com/promotello/" },
    { label: "YouTube", network: "youtube", url: "https://www.youtube.com/@promotello" },
    { label: "LinkedIn", network: "linkedin", url: "https://www.linkedin.com/company/promotello/" },
    { label: "Instagram", network: "instagram", url: "https://www.instagram.com/promotello/" },
    { label: "TikTok", network: "tiktok", url: "https://www.tiktok.com/@promotello" },
];

const marketingFooters = {
    customer: {
        homeHref: "/",
        tagline: "Discover great local offers. Save them to your wallet. Enjoy more for less.",
        groups: [
            {
                title: "Explore",
                links: [
                    { label: "Browse offers", href: "/offers" },
                    { label: "Categories", href: "/categories" },
                    { label: "Businesses", href: "/businesses" },
                ],
            },
            {
                title: "Your account",
                links: [
                    { label: "Sign in / Register", href: "/login" },
                    { label: "My vouchers", href: "/dashboard/redemptions" },
                    { label: "Help centre", href: "/help" },
                ],
            },
            {
                title: "Promotello",
                links: [
                    { label: "About us", href: "/about" },
                    { label: "Promote your business", href: "/business", external: true },
                    { label: "Contact", href: "/contact" },
                ],
            },
            { title: "Legal", links: legalLinks },
        ],
    },
    business: {
        homeHref: "/business",
        tagline: "Create smarter promotions. Reach more customers. Measure what works.",
        groups: [
            {
                title: "Product",
                links: [
                    { label: "How it works", href: "/business/how-it-works" },
                    { label: "Features", href: "/business/features" },
                    { label: "Pricing", href: "/business/pricing" },
                ],
            },
            {
                title: "Resources",
                links: [
                    { label: "Getting started", href: "/business/getting-started" },
                    { label: "FAQs", href: "/business/faq" },
                    { label: "Help centre", href: "/business/help" },
                ],
            },
            {
                title: "Promotello",
                links: [
                    { label: "About us", href: "/business/about" },
                    { label: "Explore local offers", href: "/explore", external: true },
                    { label: "Contact", href: "/business/contact" },
                ],
            },
            { title: "Legal", links: legalLinks },
        ],
    },
} satisfies Record<string, { homeHref: string; tagline: string; groups: { title: string; links: FooterLink[] }[] }>;

// Full footer for the public customer and business marketing pages.
export function MarketingFooter({ variant }: { variant: keyof typeof marketingFooters }) {
    const config = marketingFooters[variant];

    return (
        <footer className="mt-auto bg-foreground px-6 text-background">
            <div className="mx-auto max-w-7xl py-12">
                <div className="flex flex-wrap gap-10 lg:flex-nowrap lg:justify-between lg:gap-12">
                    <div className="min-w-0 basis-full lg:flex-2">
                        <Link href={config.homeHref} aria-label="Promotello home" className="inline-flex max-w-full">
                            <Image
                                src="/brand/promotello-horizontal-white.svg"
                                alt="Promotello"
                                width={180}
                                height={48}
                                className="h-auto max-w-full"
                            />
                        </Link>

                        <p className="text-sm text-balance">{config.tagline}</p>

                        <nav aria-label="Social media" className="mt-5 flex flex-wrap gap-2">
                            {socialLinks.map((social) => (
                                <SocialIcon
                                    key={social.network}
                                    url={social.url}
                                    network={social.network}
                                    label={social.label}
                                    title={social.label}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    bgColor="transparent"
                                    fgColor="currentColor"
                                    style={{ width: 40, height: 40 }}
                                    className="rounded-full bg-background text-foreground transition-colors hover:bg-primary hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
                                />
                            ))}
                        </nav>
                    </div>

                    {config.groups.map((group) => (
                        <nav
                            key={group.title}
                            aria-label={`${group.title} links`}
                            className="min-w-0 basis-[calc(50%-1.25rem)] lg:flex-1"
                        >
                            <h2 className="text-sm font-semibold">{group.title}</h2>

                            <ul className="mt-5 space-y-3">
                                {group.links.map((link: FooterLink) => (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="inline-flex items-center gap-1 text-sm text-background/75 underline-offset-4 transition-colors hover:text-background hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background"
                                        >
                                            {link.label}
                                            {link.external && (
                                                <FiExternalLink aria-hidden="true" className="size-3.5" />
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                <div className="mt-10 border-t border-background/20 pt-6 text-xs text-background/60">
                    &copy; 2026 Promotello. All rights reserved.
                </div>
            </div>
        </footer>
    );
}

const appFooters = {
    customer: {
        homeHref: "/dashboard",
        label: "Customer",
        links: [
            { label: "My vouchers", href: "/dashboard/redemptions" },
            { label: "Help centre", href: "/help" },
            { label: "Contact support", href: "/contact" },
        ],
        switchTo: { label: "Business area", href: "/business/dashboard" },
    },
    business: {
        homeHref: "/business/dashboard",
        label: "Business",
        links: [
            { label: "Help centre", href: "/business/help" },
            { label: "Getting started", href: "/business/getting-started" },
            { label: "Contact support", href: "/business/contact" },
        ],
        switchTo: { label: "Customer area", href: "/dashboard" },
    },
    admin: {
        homeHref: "/admin",
        label: "Admin",
        links: [
            { label: "Help centre", href: "/business/help" },
            { label: "Privacy policy", href: "/legal/privacy" },
        ],
        switchTo: { label: "Customer area", href: "/dashboard" },
    },
    account: {
        homeHref: "/",
        label: "Account",
        links: [
            { label: "Help centre", href: "/help" },
            { label: "Contact support", href: "/contact" },
        ],
        switchTo: null,
    },
} satisfies Record<string, { homeHref: string; label: string; links: FooterLink[]; switchTo: FooterLink | null }>;

// Compact footer for signed-in areas.
export function AppFooter({ variant }: { variant: keyof typeof appFooters }) {
    const config = appFooters[variant];

    return (
        <footer className="mt-auto border-t border-border bg-background text-foreground">
            <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
                <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                    <Link href={config.homeHref} aria-label="Promotello home" className="inline-flex w-fit shrink-0">
                        <Image
                            src="/brand/promotello-horizontal-primary.svg"
                            alt="Promotello"
                            width={150}
                            height={40}
                            className="h-auto max-w-full"
                        />
                    </Link>

                    <nav aria-label={`${config.label} support`}>
                        <ul className="flex flex-wrap gap-x-6 gap-y-3">
                            {config.links.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {config.switchTo && (
                        <Button
                            render={<Link href={config.switchTo.href} />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                            className="w-fit"
                        >
                            {config.switchTo.label}
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    )}
                </div>

                <div className="mt-7 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        &copy; 2026 Promotello. All rights reserved.
                    </p>

                    <nav aria-label={`${config.label} legal information`}>
                        <ul className="flex flex-wrap gap-x-5 gap-y-3">
                            {legalLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
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
