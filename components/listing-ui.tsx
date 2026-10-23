import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiSearch } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// Small building blocks shared by the customer listing pages.

export function SectionHeading({
    eyebrow,
    title,
    description,
    href,
    linkLabel,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    href?: string;
    linkLabel?: string;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                {eyebrow && (
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        {eyebrow}
                    </p>
                )}

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17233B] sm:text-3xl">
                    {title}
                </h2>

                {description && (
                    <p className="mt-2 max-w-2xl text-[#17233B]/65">{description}</p>
                )}
            </div>

            {href && (
                <Link
                    href={href}
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#17233B] hover:text-[#FF593F]"
                >
                    {linkLabel ?? "See all"}
                    <FiArrowRight aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}

// Pill link used for category, area and sort filters.
export function FilterChip({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${active
                ? "border-[#17233B] bg-[#17233B] text-white"
                : "border-[#17233B]/15 bg-white text-[#17233B]/75 hover:border-[#17233B]/40 hover:text-[#17233B]"
                }`}
        >
            {children}
        </Link>
    );
}

// Plain GET form so search works without JavaScript and keeps filters.
export function SearchForm({
    action,
    defaultValue,
    placeholder,
    hidden = {},
    size = "md",
}: {
    action: string;
    defaultValue?: string;
    placeholder: string;
    hidden?: Record<string, string | undefined>;
    size?: "md" | "lg";
}) {
    return (
        <form
            action={action}
            role="search"
            className={`flex w-full items-center gap-2 rounded-2xl border border-[#17233B]/10 bg-white p-1.5 shadow-sm ${size === "lg" ? "sm:p-2" : ""}`}
        >
            {Object.entries(hidden).map(([name, value]) =>
                value ? <input key={name} type="hidden" name={name} value={value} /> : null,
            )}

            <FiSearch aria-hidden="true" className="ml-3 size-5 shrink-0 text-[#17233B]/40" />

            <input
                type="search"
                name="search"
                defaultValue={defaultValue}
                placeholder={placeholder}
                aria-label={placeholder}
                className={`min-w-0 flex-1 bg-transparent px-1 text-[#17233B] outline-none placeholder:text-[#17233B]/45 ${size === "lg" ? "h-12 text-base" : "h-10 text-sm"}`}
            />

            <Button type="submit" size={size === "lg" ? "lg" : "default"} className="shrink-0 rounded-xl">
                Search
            </Button>
        </form>
    );
}

export function EmptyState({
    title,
    description,
    href,
    linkLabel,
}: {
    title: string;
    description: string;
    href?: string;
    linkLabel?: string;
}) {
    return (
        <div className="rounded-3xl border border-dashed border-[#17233B]/20 bg-white px-6 py-14 text-center">
            <h3 className="text-xl font-semibold text-[#17233B]">{title}</h3>
            <p className="mx-auto mt-2 max-w-md text-[#17233B]/65">{description}</p>

            {href && (
                <Button
                    render={<Link href={href} />}
                    nativeButton={false}
                    variant="outline"
                    className="mt-6"
                >
                    {linkLabel ?? "Clear filters"}
                </Button>
            )}
        </div>
    );
}

export function CategoryTile({
    href,
    name,
    tagline,
    image,
    count,
    size = "md",
}: {
    href: string;
    name: string;
    tagline?: string | null;
    image: string;
    count?: number;
    size?: "md" | "lg";
}) {
    return (
        <Link
            href={href}
            className={`group relative isolate flex overflow-hidden rounded-2xl bg-[#17233B] ${size === "lg" ? "aspect-[4/3]" : "aspect-[5/4]"}`}
        >
            <Image
                src={image}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="-z-10 object-cover transition duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#17233B]/90 via-[#17233B]/30 to-transparent" />

            <div className="mt-auto p-5 text-white">
                <h3 className={`font-semibold tracking-tight ${size === "lg" ? "text-2xl" : "text-xl"}`}>
                    {name}
                </h3>

                {tagline && <p className="mt-1 text-sm text-white/80">{tagline}</p>}

                {count !== undefined && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                        {count} {count === 1 ? "offer" : "offers"}
                        <FiArrowRight aria-hidden="true" className="transition group-hover:translate-x-0.5" />
                    </p>
                )}
            </div>
        </Link>
    );
}

// Builds a URL from the current query, applying updates (null removes a key).
export function hrefWith(
    path: string,
    current: Record<string, string | undefined>,
    updates: Record<string, string | null>,
) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries({ ...current, ...updates })) {
        if (value) {
            params.set(key, value);
        }
    }

    const query = params.toString();
    return query ? `${path}?${query}` : path;
}
