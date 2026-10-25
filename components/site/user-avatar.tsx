"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Profile photo with an initials fallback (also shown while the photo
// loads, or if it fails).
export function UserAvatar({
    src,
    initials,
    size = 36,
}: {
    src?: string;
    initials: string;
    size?: number;
}) {
    return (
        <Avatar aria-hidden="true" style={{ width: size, height: size }}>
            {src && <AvatarImage src={src} alt="" width={size} height={size} />}
            <AvatarFallback
                className="bg-[#17233B] font-semibold text-white"
                style={{ fontSize: Math.round(size * 0.38) }}
            >
                {initials}
            </AvatarFallback>
        </Avatar>
    );
}
