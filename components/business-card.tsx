import Image from "next/image";
import Link from "next/link";
import { FiMapPin } from "react-icons/fi";

import { ExampleBadge } from "@/components/example-badge";
import type { ListingBusiness } from "@/lib/listings";
import { businessPath } from "@/lib/slugs";
import { storedImage } from "@/lib/images";

// `showCity` names the city under the business, for listings that show more
// than one at a time: "Clifton" on its own doesn't say which city.
export function BusinessCard({ business, showCity = false }: { business: ListingBusiness; showCity?: boolean }) {
    return (
        <article
            data-slot="business-card"
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
            <div className="relative aspect-[16/9] overflow-hidden bg-[#17233B]">
                {storedImage(business.coverImageUrl) ? (
                    <Image
                        src={storedImage(business.coverImageUrl)!}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover opacity-90 transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="h-full bg-gradient-to-br from-[#17233B] via-[#24345A] to-[#FF593F]/60" />
                )}

                {business.isSample && <ExampleBadge className="absolute left-3 top-3" />}

                {business.unclaimed && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#17233B]/75 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        Not claimed yet
                    </span>
                )}

                {business.offerCount > 0 && (
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#17233B] shadow-sm">
                        {business.offerCount} {business.offerCount === 1 ? "offer" : "offers"}
                    </span>
                )}
            </div>

            {/* Not positioned, so the name's link covers the whole card. */}
            <div className="flex flex-1 flex-col px-5 pb-5">
                <div className="relative -mt-8 flex items-end justify-between gap-3">
                    {storedImage(business.logoUrl) ? (
                        <Image
                            src={storedImage(business.logoUrl)!}
                            alt=""
                            width={64}
                            height={64}
                            className="size-16 rounded-2xl border-4 border-white object-cover shadow-sm"
                        />
                    ) : (
                        <span className="flex size-16 items-center justify-center rounded-2xl border-4 border-white bg-[#FFF4E8] text-xl font-semibold text-[#FF593F] shadow-sm">
                            {business.name.charAt(0).toUpperCase()}
                        </span>
                    )}

                    <span className="mb-1 truncate rounded-full bg-[#FFF4E8] px-3 py-1 text-xs font-medium text-[#17233B]/75">
                        {business.categoryName}
                    </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold text-[#17233B]">
                    <Link
                        href={businessPath(business)}
                        className="after:absolute after:inset-0 focus-visible:outline-none"
                    >
                        {business.name}
                    </Link>
                </h3>

                {(business.area || (showCity && business.city)) && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-[#17233B]/70">
                        <FiMapPin aria-hidden="true" className="size-3.5" />
                        {[business.area, showCity && business.city !== business.area ? business.city : null]
                            .filter(Boolean)
                            .join(", ")}
                    </p>
                )}

                {business.description && (
                    <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-[#17233B]/65">
                        {business.description}
                    </p>
                )}

                {/* A page nobody has taken over yet. It cannot have an
                    offer to show, so the space says why rather than
                    leaving a card that looks broken. */}
                {business.unclaimed && (
                    <p className="mt-4 rounded-xl bg-[#FFF8F0] px-3 py-2.5 text-sm text-[#17233B]/70">
                        We built this page. No offers until its owner claims it.
                    </p>
                )}

                {business.topOffer && (
                    <p className="mt-4 truncate rounded-xl bg-[#FFF8F0] px-3 py-2.5 text-sm">
                        <span className="font-semibold text-[#FF593F]">
                            {business.topOffer.discount}
                        </span>
                        {/* Skip the title when it just repeats the discount. */}
                        {!business.topOffer.title
                            .toLowerCase()
                            .startsWith(business.topOffer.discount.toLowerCase()) && (
                            <span className="text-[#17233B]/70"> · {business.topOffer.title}</span>
                        )}
                    </p>
                )}
            </div>
        </article>
    );
}
