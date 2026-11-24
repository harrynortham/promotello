// Where else to find a business.
//
// They know their handle — "@theanchorbristol" — far better than they
// know the address of their own profile page, and a form that insists
// on a full URL makes them go and look it up. So the field takes
// whatever they have: the handle, the handle with an @ on it, the bit
// after the slash, or the whole address pasted out of the browser.
// All four land on the same stored URL.

export type SocialNetwork = {
    key: SocialKey;
    // What the business calls it.
    label: string;
    // The column it lives in.
    column: `${SocialKey}_url`;
    // What goes in front of a bare handle.
    prefix: string;
    // Hosts that count as "already a link to this network". The first
    // is the canonical one.
    hosts: string[];
    // The shape of the answer, not an example of one.
    //
    // These used to read "@theanchorbristol", which is a real-looking
    // handle for a business that is not theirs — it reads as a value
    // already in the box, and it tells them nothing about what they
    // are supposed to type. A placeholder's job is the format.
    placeholder: string;
};

export type SocialKey = "instagram" | "facebook" | "x" | "youtube" | "linkedin" | "tiktok";

// The order every row of these goes in, everywhere: the site footer, the
// email footer, the signature, a business's own page, and the form that
// asks for them. Instagram and Facebook lead because that is where these
// businesses actually are, and TikTok sits last.
//
// Written down because it is kept in three lists that cannot import one
// another cleanly — this one, socialProfiles in lib/site.ts and the
// signature's HTML — and a unit test holds each of them to it.
export const SOCIAL_ORDER: SocialKey[] = [
    "instagram",
    "facebook",
    "x",
    "youtube",
    "linkedin",
    "tiktok",
];

// The six worth asking about. Instagram and Facebook are where nearly
// all of these businesses already are; the rest are here so the ones
// who have built something elsewhere are not told it does not count.
export const SOCIAL_NETWORKS: SocialNetwork[] = [
    {
        key: "instagram",
        label: "Instagram",
        column: "instagram_url",
        prefix: "https://instagram.com/",
        hosts: ["instagram.com", "www.instagram.com"],
        placeholder: "@yourhandle",
    },
    {
        key: "facebook",
        label: "Facebook",
        column: "facebook_url",
        prefix: "https://facebook.com/",
        hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "fb.me"],
        placeholder: "yourpagename",
    },
    {
        key: "x",
        label: "X",
        column: "x_url",
        prefix: "https://x.com/",
        hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
        placeholder: "@yourhandle",
    },
    {
        key: "youtube",
        label: "YouTube",
        column: "youtube_url",
        prefix: "https://youtube.com/@",
        hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
        placeholder: "@yourchannel",
    },
    {
        key: "linkedin",
        label: "LinkedIn",
        column: "linkedin_url",
        prefix: "https://linkedin.com/company/",
        hosts: ["linkedin.com", "www.linkedin.com", "uk.linkedin.com"],
        placeholder: "company/your-business",
    },
    {
        key: "tiktok",
        label: "TikTok",
        column: "tiktok_url",
        // TikTok handles carry the @ in the path, unlike the others.
        prefix: "https://tiktok.com/@",
        hosts: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
        placeholder: "@yourhandle",
    },
];

export const socialNetwork = (key: SocialKey) =>
    SOCIAL_NETWORKS.find((network) => network.key === key)!;

// What to store for what they typed, or null for nothing, or the
// string "invalid" — distinguished because an empty box means "I don't
// have one" and a wrong one means "that isn't a link".
export type SocialInput = { url: string } | { url: null } | { invalid: true };

export function socialUrl(key: SocialKey, value: string | null | undefined): SocialInput {
    const typed = (value ?? "").trim();

    if (!typed) return { url: null };

    // Pasted a link. Any host at all means they meant a link, so a link
    // to the wrong network is an error rather than something we quietly
    // turn into a handle.
    if (/^https?:\/\//i.test(typed) || /^[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(typed)) {
        const withScheme = /^https?:\/\//i.test(typed) ? typed : `https://${typed}`;

        if (/\s/.test(withScheme) || !URL.canParse(withScheme)) return { invalid: true };

        const parsed = new URL(withScheme);
        const network = socialNetwork(key);

        if (!network.hosts.includes(parsed.hostname.toLowerCase())) return { invalid: true };
        // A link to the network's front page is not a link to them.
        if (parsed.pathname === "/" || parsed.pathname === "") return { invalid: true };

        // Kept whole, query and all: a Facebook page is sometimes only
        // reachable as profile.php?id=…, and trimming that breaks it.
        // Only the scheme is forced, so an http link stored years ago
        // does not send somebody somewhere insecure.
        parsed.protocol = "https:";

        return { url: parsed.toString().replace(/\/$/, "") };
    }

    // A handle. The @ is decoration everywhere except in the path,
    // where each network has its own opinion, so it is stripped here
    // and the prefix puts back whatever that network wants.
    const handle = typed.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");

    if (!/^[A-Za-z0-9._\-/]{1,100}$/.test(handle)) return { invalid: true };

    return { url: `${socialNetwork(key).prefix}${handle}` };
}

// What to put in the box when the form opens: the handle rather than
// the URL, since that is what they typed and what they recognise.
export function socialHandle(key: SocialKey, url: string | null | undefined) {
    if (!url) return "";

    const network = socialNetwork(key);

    if (!url.startsWith(network.prefix)) return url;

    const rest = url.slice(network.prefix.length);

    // Back to the form it was typed in, @ and all.
    return network.prefix.endsWith("@") ? `@${rest}` : rest;
}

// The ones a business has filled in, in a fixed order so the row of
// icons does not rearrange itself between pages.
export function socialsOf(business: Partial<Record<`${SocialKey}_url`, string | null>>) {
    return SOCIAL_NETWORKS.map((network) => ({
        network,
        url: business[network.column] ?? null,
    })).filter((entry): entry is { network: SocialNetwork; url: string } => Boolean(entry.url));
}
