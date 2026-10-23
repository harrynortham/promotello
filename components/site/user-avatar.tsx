"use client";

import Image from "next/image";
import { useState } from "react";

// Profile photo with an initials fallback (also used if the photo fails).
export function UserAvatar({
    src,
    initials,
    size = 36,
}: {
    src?: string;
    initials: string;
    size?: number;
}) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImage = Boolean(src) && failedSrc !== src;

    return (
        <span
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17233B] font-semibold text-white"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
        >
            {showImage ? (
                <Image
                    src={src!}
                    alt=""
                    width={size}
                    height={size}
                    className="h-full w-full object-cover"
                    onError={() => setFailedSrc(src!)}
                />
            ) : (
                initials
            )}
        </span>
    );
}
