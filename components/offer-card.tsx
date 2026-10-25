import Image from "next/image";
import Link from "next/link";
import { FiClock, FiMapPin } from "react-icons/fi";

type OfferCardProps = {
    slug: string;
    discount: string;
    title: string;
    description: string;
    availability: string;
    business?: string;
    businessId?: string;
    businessLogoUrl?: string | null;
    imageUrl?: string | null;
    expiresAt?: string;
    area?: string | null;
    category?: string | null;
};

function daysLeft(expiresAt: string) {
    const today = new Date(new Date().toISOString().slice(0, 10));
    return Math.round((new Date(expiresAt).getTime() - today.getTime()) / 86_400_000);
}

function endsLabel(expiresAt: string) {
    const days = daysLeft(expiresAt);

    if (days <= 0) return "Ends today";
    if (days === 1) return "Ends tomorrow";
    if (days <= 14) return `Ends in ${days} days`;

    return `Ends ${new Date(expiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
    })}`;
}

export function OfferCard({
    slug,
    discount,
    title,
    description,
    availability,
    business,
    businessLogoUrl,
    imageUrl,
    expiresAt,
    area,
    category,
}: OfferCardProps) {
    const endingSoon = expiresAt !== undefined && daysLeft(expiresAt) <= 14;

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative aspect-[16/10] overflow-hidden bg-[#FFF4E8]">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#FF593F]/20 via-[#FFF4E8] to-[#FFF8F0] text-4xl font-semibold tracking-tight text-[#FF593F]">
                        {discount}
                    </div>
                )}

                <span className="absolute left-3 top-3 rounded-full bg-[#FF593F] px-3 py-1 text-sm font-semibold text-white shadow-sm">
                    {discount}
                </span>

                {expiresAt && (
                    <span
                        className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${endingSoon ? "bg-[#17233B] text-white" : "bg-white/90 text-[#17233B]/75"}`}
                    >
                        <FiClock aria-hidden="true" className="size-3" />
                        {endsLabel(expiresAt)}
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col p-5">
                {business && (
                    <div className="flex items-center gap-2.5">
                        {businessLogoUrl ? (
                            <Image
                                src={businessLogoUrl}
                                alt=""
                                width={32}
                                height={32}
                                className="size-8 rounded-lg object-cover"
                            />
                        ) : (
                            <span className="flex size-8 items-center justify-center rounded-lg bg-[#FFF4E8] text-sm font-semibold text-[#FF593F]">
                                {business.charAt(0).toUpperCase()}
                            </span>
                        )}

                        <div className="min-w-0 text-sm leading-tight">
                            <p className="truncate font-medium text-[#17233B]">
                                {business}
                            </p>

                            {(area || category) && (
                                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#17233B]/70">
                                    {area && (
                                        <FiMapPin aria-hidden="true" className="size-3 shrink-0" />
                                    )}
                                    {[area, category].filter(Boolean).join(" · ")}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <h3 className="mt-4 text-lg font-semibold leading-snug text-[#17233B]">
                    <Link
                        href={`/offers/${slug}`}
                        className="after:absolute after:inset-0 focus-visible:outline-none"
                    >
                        {title}
                    </Link>
                </h3>

                <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-[#17233B]/65">
                    {description}
                </p>

                <p className="mt-4 border-t border-[#17233B]/10 pt-4 text-sm text-[#17233B]/70">
                    {availability}
                </p>
            </div>
        </article>
    );
}
