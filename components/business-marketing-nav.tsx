"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { FiMenu, FiX } from "react-icons/fi"
import { Button } from "@/components/ui/button"

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <>
            <header className="sticky top-0 z-50 backdrop-blur-md bg-background">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
                    <Link href="/" aria-label="Home">
                        <Image
                            src="/brand/promotello-horizontal-primary.svg"
                            alt="Promotello Logo"
                            width={180}
                            height={48}

                            priority
                        />
                    </Link>

                    <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
                        <Link href="/business/features" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                            Features
                        </Link>

                        <Link href="/business/how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                            How it works
                        </Link>

                        <Link href="/business/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                            Pricing
                        </Link>

                        <Button
                            size="lg"
                            render={<Link href="/business/register" />}
                            nativeButton={false}
                        >
                            Sign up
                        </Button>
                    </nav>

                    <button
                        type="button"
                        className="rounded-md p-2 text-slate-900 hover:bg-white md:hidden cursor-pointer"
                        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                        aria-controls="mobile-menu"
                        aria-expanded={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
                    >
                        {isMobileMenuOpen ? (
                            <FiX className="size-6" aria-hidden="true" />
                        ) : (
                            <FiMenu className="size-6" aria-hidden="true" />
                        )}
                    </button>
                </div>

                <nav
                    id="mobile-menu"
                    className={`${isMobileMenuOpen ? "block" : "hidden"} relative z-50 bg-background px-5 pb-5 pt-3 md:hidden`}
                    aria-label="Mobile navigation"
                >


                    <Link
                        href="/business/features"
                        className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Features
                    </Link>

                    <Link
                        href="/business/how-it-works"
                        className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        How it works
                    </Link>

                    <Link
                        href="/business/pricing"
                        className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Pricing
                    </Link>

                    <Button
                        size="lg"
                        render={<Link href="/business/register" />}
                        nativeButton={false}
                        className="mt-2 w-full"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Sign up
                    </Button>
                </nav>
            </header>

            {isMobileMenuOpen && (
                <button
                    type="button"
                    className="fixed inset-x-0 bottom-0 top-20 z-40 bg-slate-950/5 backdrop-blur-xs md:hidden"
                    aria-label="Close menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </>
    )
}
