import Image from "next/image"
import Link from "next/link"

export default function Header() {

    return (
        <header className="sticky top-0 z-50 backdrop-blur-md">
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
                    <a href="#about" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                        About
                    </a>

                    <a href="#services" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                        Services
                    </a>

                    <a href="#work" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                        Work
                    </a>

                    <a
                        href="#contact"
                        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                        Let’s talk
                    </a>
                </nav>

                <button
                    type="button"
                    className="rounded-md p-2 text-slate-900 hover:bg-slate-100 md:hidden"
                    aria-label="Open menu"
                    aria-controls="mobile-menu"
                    aria-expanded="false"
                >
                    menu
                </button>
            </div>

            <nav
                id="mobile-menu"
                className="hidden border-t border-slate-200 bg-white px-5 pb-5 pt-3 md:hidden"
                aria-label="Mobile navigation"
            >
                <a href="#about" className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    About
                </a>

                <a href="#services" className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Services
                </a>

                <a href="#work" className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Work
                </a>

                <a
                    href="#contact"
                    className="mt-2 block rounded-full bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white"
                >
                    Let’s talk
                </a>
            </nav>
        </header>
    )
}