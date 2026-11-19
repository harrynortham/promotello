import Image from "next/image";
import { FiGift, FiMapPin } from "react-icons/fi";

import { BrowserFrame } from "@/components/product-visuals";
import { Badge } from "@/components/ui/badge";
import { storedImage } from "@/lib/images";

export type PagePreview = {
    name: string;
    category?: string | null;
    area?: string | null;
    city?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    // The offer on the card at the bottom: a real one, or the one we
    // suggested when we built the page.
    offer?: string | null;
};

function Initials({ name }: { name: string }) {
    const letters = name.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase();

    return (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4E8] text-xl font-semibold text-[#17233B]">
            {letters}
        </span>
    );
}

// Their page, small enough to sit beside something else. It is on the
// preview we email them and in the setup flow afterwards, deliberately:
// the thing they were shown is the thing they are filling in, and they
// can watch it fill.
//
// Blank where something is missing rather than hiding it, so an empty
// strip where a cover photo goes reads as a thing to do.
export function BusinessPagePreview({
    page,
    className = "",
    // Show the Follow button that a real page has under its
    // description, rather than an offer block that no page has there.
    follow = false,
    // How many offers the page is showing. On a preview that is the one
    // sample offer; the real page counts its live ones.
    offers,
}: {
    page: PagePreview;
    className?: string;
    follow?: boolean;
    offers?: number;
}) {
    const where = [page.area, page.city]
        .filter((part, index, parts) => part && parts.indexOf(part) === index)
        .join(", ");

    const cover = storedImage(page.coverImageUrl);
    const logo = storedImage(page.logoUrl);

    return (
        <BrowserFrame url="promotello.com/businesses/…" label={`${page.name}'s page on Promotello`} className={className}>
            <div className="bg-[#FFF8F0] p-5 text-[#17233B]">
                {cover ? (
                    <Image src={cover} alt="" width={480} height={160} className="h-20 w-full rounded-xl object-cover" />
                ) : (
                    <div className="h-20 rounded-xl bg-[#17233B]" />
                )}

                {/* Logo left, trade on the right under the cover —
                    the row a real page has. The category used to sit in
                    the location line, which is not where anybody who
                    has seen the live page would look for it.
                    items-end, and no margin on the badge, so it sits on
                    the logo's bottom edge rather than near it. */}
                <div className="-mt-7 flex items-end justify-between gap-3 px-3">
                    {logo ? (
                        <Image
                            src={logo}
                            alt=""
                            width={56}
                            height={56}
                            className="size-14 rounded-2xl border-4 border-white bg-white object-contain"
                        />
                    ) : (
                        <Initials name={page.name} />
                    )}

                    {page.category && (
                        <Badge variant="secondary" className="max-w-[60%] whitespace-normal text-right">
                            {page.category}
                        </Badge>
                    )}
                </div>

                <p className="mt-3 text-lg font-semibold">{page.name}</p>

                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#17233B]/70">
                    <FiMapPin aria-hidden="true" />
                    {where || "Your area"}
                </p>

                {page.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-[#17233B]/70">{page.description}</p>
                ) : (
                    <div className="mt-3 space-y-1.5" aria-hidden="true">
                        <div className="h-2 w-5/6 rounded-full bg-[#17233B]/10" />
                        <div className="h-2 w-2/3 rounded-full bg-[#17233B]/10" />
                    </div>
                )}

                {/* What is actually under the description on a real
                    page. The offer block that used to sit here was
                    invented — on the live page offers are a section of
                    their own further down, and this is where Follow is. */}
                {follow ? (
                    <>
                        {/* "Current offers" is what the real page calls
                            the section this points at. */}
                        {offers !== undefined && offers > 0 && (
                            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#17233B]/10 bg-white p-2.5">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                    <FiGift aria-hidden="true" className="size-3.5 text-[#FF593F]" />
                                    {offers} current offer{offers === 1 ? "" : "s"}
                                </span>

                                <span className="rounded-lg bg-[#FF593F] px-2.5 py-1 text-[11px] font-semibold text-white">
                                    View offers
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    page.offer && (
                        <div className="mt-4 rounded-xl border border-[#17233B]/10 bg-white p-3">
                            <span className="inline-flex rounded-full bg-[#FF593F] px-2.5 py-0.5 text-xs font-semibold text-white">
                                Offer
                            </span>
                            <p className="mt-1.5 text-sm font-semibold">{page.offer}</p>
                            <div className="mt-2 rounded-lg bg-[#FF593F] py-1.5 text-center text-xs font-semibold text-white">
                                Claim offer
                            </div>
                        </div>
                    )
                )}
            </div>
        </BrowserFrame>
    );
}
