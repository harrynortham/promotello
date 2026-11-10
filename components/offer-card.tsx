import Image from "next/image";
import Link from "next/link";
import { FiClock, FiMapPin } from "react-icons/fi";

import { ExampleBadge } from "@/components/example-badge";
import { localImage, storedImage } from "@/lib/images";

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
    // The city, when a listing is showing more than one and "Clifton" alone
    // wouldn't say where this is.
    city?: string | null;
    category?: string | null;
    // A sample offer: labelled so it isn't mistaken for a real one.
    example?: boolean;
    // For a live preview: a blob: URL can't go through next/image.
    rawImage?: boolean;
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
    city,
    category,
    example = false,
    rawImage = false,
}: OfferCardProps) {
    const endingSoon = expiresAt !== undefined && daysLeft(expiresAt) <= 14;

    // Read once: a URL on a host next/image doesn't allow throws, and an
    // Image with a null src throws too, so both are decided up here and
    // anything we didn't store falls back to the drawn panel and initial.
    const image = storedImage(imageUrl);
    const logo = storedImage(businessLogoUrl);

    // A live preview hands over a blob: URL for a photo that hasn't been
    // uploaded yet, which storedImage rightly refuses. Without a guard of
    // its own the raw path could never fire, and the preview beside the
    // form stayed empty however many photos were chosen.
    const raw = rawImage ? (localImage(imageUrl) ?? image) : null;

    return (
        <article
            data-slot="offer-card"
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
            <div className="relative aspect-[16/10] overflow-hidden bg-[#FFF4E8]">
                {raw ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={raw}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                    />
                ) : image ? (
                    <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    // Offers now need a photo, so this is for the ones
                    // made before that. It says the business's name
                    // rather than repeating the discount that is already
                    // on the pill an inch above it.
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#FF593F]/20 via-[#FFF4E8] to-[#FFF8F0] px-6 text-center">
                        <span className="line-clamp-2 text-xl font-semibold tracking-tight text-[#FF593F]/75">
                            {business ?? title}
                        </span>
                    </div>
                )}

                {/* Kept clear of the "ends" pill on the right, whatever
                    the offer says. */}
                <span className="absolute left-3 top-3 max-w-[60%] truncate rounded-full bg-[#FF593F] px-3 py-1 text-sm font-semibold text-white shadow-sm">
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

                {example && <ExampleBadge className="absolute bottom-3 left-3" />}
            </div>

            <div className="flex flex-1 flex-col p-5">
                {business && (
                    <div className="flex items-center gap-2.5">
                        {logo ? (
                            <Image
                                src={logo}
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

                            {(area || city || category) && (
                                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#17233B]/70">
                                    {(area || city) && (
                                        <FiMapPin aria-hidden="true" className="size-3 shrink-0" />
                                    )}
                                    {[[area, city === area ? null : city].filter(Boolean).join(", "), category].filter(Boolean).join(" · ")}
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
