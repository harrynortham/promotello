import Image from "next/image";

import { storedImage } from "@/lib/images";

// The room, the counter, what they make.
//
// A strip rather than a grid: this page is a column of rows on a phone,
// and a gallery that takes three screens of scrolling pushes the one
// thing somebody came for off the bottom. Six at most, and they swipe.

export function BioPhotos({
    photos,
    businessName,
}: {
    photos: { id: string; storage_path: string; caption: string | null }[];
    businessName: string;
}) {
    const shown = photos
        .map((photo) => ({ ...photo, src: storedImage(photo.storage_path) }))
        .filter((photo) => photo.src);

    if (shown.length === 0) return null;

    return (
        <ul
            aria-label={`Photos of ${businessName}`}
            className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1"
        >
            {shown.map((photo) => (
                <li key={photo.id} className="shrink-0 snap-start">
                    <Image
                        src={photo.src!}
                        alt={photo.caption ?? ""}
                        width={320}
                        height={240}
                        className="h-36 w-52 rounded-2xl border border-[#17233B]/10 object-cover"
                    />
                </li>
            ))}
        </ul>
    );
}
