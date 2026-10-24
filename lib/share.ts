import { absoluteUrl } from "@/lib/site";

// Links people share carry ?ref=share so views from them can be counted.
export function shareLink(path: string) {
    return `${absoluteUrl(path)}?ref=share`;
}

export function offerShareCaption(offer: { title: string; discount: string; businessName: string }) {
    return `${offer.discount} at ${offer.businessName}: ${offer.title}. Claim it free on Promotello 👇`;
}

export type ShareTarget = {
    url: string;
    text: string;
};

// Links that open each network's own share screen.
export function shareLinks({ url, text }: ShareTarget) {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(text);

    return {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
        x: `https://x.com/intent/post?text=${t}&url=${u}`,
        email: `mailto:?subject=${t}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    };
}
