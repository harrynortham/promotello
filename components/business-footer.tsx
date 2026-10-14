"use client"

import Image from "next/image"
import Link from "next/link"
import { FiExternalLink } from "react-icons/fi"
import { SocialIcon } from "react-social-icons/component"
import "react-social-icons/x"
import "react-social-icons/facebook"
import "react-social-icons/youtube"
import "react-social-icons/linkedin"
import "react-social-icons/instagram"
import "react-social-icons/tiktok"

const linkGroups = [
    {
        title: "Product",
        links: [
            { label: "Features", href: "/business/features" },
            { label: "How it works", href: "/business/product" },
            { label: "Pricing", href: "/business/pricing" },
        ],
    },
    {
        title: "Resources",
        links: [
            { label: "Business help centre", href: "/business/help-centre" },
            { label: "FAQs", href: "/business/faq" },
            { label: "Getting started", href: "/business/getting-started" },
        ],
    },
    {
        title: "Get started",
        links: [
            { label: "Create business account", href: "/business/register" },
            { label: "Business login", href: "/business/login", showLinkIcon: true },
            { label: "Explore local offers", href: "/explore" },
        ],
    },
    {
        title: "Company & legal",
        links: [
            { label: "About Promotello", href: "/about" },
            { label: "Contact", href: "/contact" },
            { label: "Privacy policy", href: "/privacy-policy" },
            { label: "Terms of service", href: "/terms-of-service" },
            { label: "Cookie policy", href: "/cookie-policy" },
        ],
    },
]

const socialLinks = [
    { label: "X", network: "x", url: "https://x.com/promotello" },
    { label: "Facebook", network: "facebook", url: "https://www.facebook.com/promotello/" },
    { label: "YouTube", network: "youtube", url: "https://www.youtube.com/@promotello" },
    { label: "LinkedIn", network: "linkedin", url: "https://www.linkedin.com/company/promotello/" },
    { label: "Instagram", network: "instagram", url: "https://www.linkedin.com/company/promotello/" },
    { label: "TikTok", network: "tiktok", url: "https://www.tiktok.com/@promotello" },
]

export default function Footer() {

    return (
        <footer className="bg-foreground text-background mt-auto ">
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-12">
                <div className="flex flex-col gap-10 md:flex-row md:flex-wrap lg:flex-nowrap lg:justify-between lg:gap-12">
                    <div className="min-w-0 md:basis-[calc(50%-1.25rem)] lg:flex-2 ">
                        <Link href="/" aria-label="Promotello home" className="inline-flex max-w-full">
                            <Image
                                src="/brand/promotello-horizontal-white.svg"
                                alt="Promotello"
                                width={180}
                                height={48}
                                className="h-auto max-w-full"
                            />
                        </Link>
                        <p className="text-sm text-balance">Create smarter promotions. Reach more customers. Measure what works.</p>
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
                    {linkGroups.map((group) => (
                        <nav key={group.title} aria-label={`${group.title} links`} className="min-w-0 md:basis-[calc(50%-1.25rem)] lg:flex-1">
                            <h2 className="text-sm font-semibold">{group.title}</h2>
                            <ul className="mt-5 space-y-3">
                                {group.links.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="inline-flex items-center gap-1 text-sm text-background/75 transition-colors hover:text-background hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background"
                                        >
                                            {link.label}
                                            {link.showLinkIcon && <FiExternalLink aria-hidden="true" className="size-3.5" />}
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
    )
}
