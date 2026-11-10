import Image from "next/image";
import { FiMapPin } from "react-icons/fi";

import { BrowserFrame } from "@/components/product-visuals";
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
export function BusinessPagePreview({ page, className = "" }: { page: PagePreview; className?: string }) {
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

                <div className="-mt-7 flex items-end gap-3 px-3">
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
                </div>

                <p className="mt-3 text-lg font-semibold">{page.name}</p>

                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#17233B]/70">
                    <FiMapPin aria-hidden="true" />
                    {[page.category, where].filter(Boolean).join(" · ") || "Your area"}
                </p>

                {page.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-[#17233B]/70">{page.description}</p>
                ) : (
                    <div className="mt-3 space-y-1.5" aria-hidden="true">
                        <div className="h-2 w-5/6 rounded-full bg-[#17233B]/10" />
                        <div className="h-2 w-2/3 rounded-full bg-[#17233B]/10" />
                    </div>
                )}

                {page.offer && (
                    <div className="mt-4 rounded-xl border border-[#17233B]/10 bg-white p-3">
                        <span className="inline-flex rounded-full bg-[#FF593F] px-2.5 py-0.5 text-xs font-semibold text-white">
                            Offer
                        </span>
                        <p className="mt-1.5 text-sm font-semibold">{page.offer}</p>
                        <div className="mt-2 rounded-lg bg-[#FF593F] py-1.5 text-center text-xs font-semibold text-white">
                            Claim offer
                        </div>
                    </div>
                )}
            </div>
        </BrowserFrame>
    );
}
