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

        // Compared against the configured Supabase origin rather than a
        // literal "https:", so the local stack works: it serves storage
        // over http on 127.0.0.1:55321, and hardcoding the scheme meant
        // every logo and offer photograph read as no image at all while
        // developing. Deployed, NEXT_PUBLIC_SUPABASE_URL is https, so
        // https is still the only thing that passes there.
        //
        // Origin covers scheme, host and port together, which is also
        // tighter than the hostname check it replaces: that one would
        // have accepted the same host on any port.
        return image.origin === new URL(allowed).origin &&
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

// What to encode a cropped image as, given whether it turned out to
// need transparency.
//
// Pure, so the rule is pinned by a test while the pixel-reading that
// answers `transparent` stays in the canvas code that can see them
// (components/image-cropper.tsx).
//
// "auto" is a logo. A file's type says it *can* carry transparency, not
// that it does: both WebP logos we had were fully opaque, and as PNG
// they came out four and eight times bigger for nothing. Never WebP
// whatever was chosen — Outlook on Windows renders mail through Word,
// which has never supported it, so a .webp logo arrives in an email as
// a red cross and lib/email.ts refuses to send one.
export function encodingFor(requested: string, transparent: boolean) {
    if (requested !== "auto") return requested;

    return transparent ? "image/png" : "image/jpeg";
}
