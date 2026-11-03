import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Page one lives at the base path, so /blog/page/1 never exists.
function hrefFor(basePath: string, page: number) {
    return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

const base =
    "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border px-4 text-sm font-medium transition";
const idle = "border-[#17233B]/15 bg-white text-[#17233B]/75 hover:border-[#17233B]/40 hover:text-[#17233B]";
const current = "border-[#17233B] bg-[#17233B] text-white";
const disabled = "pointer-events-none border-[#17233B]/10 bg-white text-[#17233B]/30";

export function Pagination({ basePath, page, totalPages }: { basePath: string; page: number; totalPages: number }) {
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
        <nav aria-label="Blog pages" className="mt-14 flex flex-wrap items-center justify-center gap-2">
            <Link
                href={hrefFor(basePath, page - 1)}
                aria-label="Previous page"
                aria-disabled={page === 1 || undefined}
                tabIndex={page === 1 ? -1 : undefined}
                className={`${base} ${page === 1 ? disabled : idle}`}
            >
                <FiChevronLeft aria-hidden="true" />
                Previous
            </Link>

            {pages.map((item) => (
                <Link
                    key={item}
                    href={hrefFor(basePath, item)}
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                    className={`${base} ${item === page ? current : idle}`}
                >
                    {item}
                </Link>
            ))}

            <Link
                href={hrefFor(basePath, page + 1)}
                aria-label="Next page"
                aria-disabled={page === totalPages || undefined}
                tabIndex={page === totalPages ? -1 : undefined}
                className={`${base} ${page === totalPages ? disabled : idle}`}
            >
                Next
                <FiChevronRight aria-hidden="true" />
            </Link>
        </nav>
    );
}
