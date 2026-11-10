// next.config.ts allows next/image exactly one host — Supabase storage,
// under /storage/v1/object/public/. Anything else doesn't fail the
// picture: next/image throws, the boundary catches it, and the whole page
// becomes "We couldn't finish loading this page". A business whose logo
// ended up somewhere unexpected would lose its dashboard, with nothing on
// screen to act on.
//
// So a stored URL is checked before it is handed over, and one that isn't
// servable reads as no image at all — which every one of these places
// already draws: initials, a plain band, a gift icon.

const PUBLIC_PATH = "/storage/v1/object/public/";

export function storedImage(url: string | null | undefined) {
    if (!url) {
        return null;
    }

    const allowed = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!allowed) {
        return null;
    }

    try {
        const image = new URL(url);

        return image.protocol === "https:" &&
            image.hostname === new URL(allowed).hostname &&
            image.pathname.startsWith(PUBLIC_PATH)
            ? url
            : null;
    } catch {
        // Not a URL at all.
        return null;
    }
}

// A picture the browser made a moment ago and hasn't uploaded yet: a live
// preview holds a blob: URL from URL.createObjectURL. No remote-pattern
// check can vouch for one and next/image can't take one, so it goes to a
// plain <img> — and the only thing worth checking is that it came from
// this page rather than from somewhere else.
export function localImage(url: string | null | undefined) {
    if (!url) {
        return null;
    }

    return url.startsWith("blob:") || url.startsWith("data:image/") ? url : null;
}
