import { FOUNDING_MEMBER_LIMIT, TRIAL_DAYS, plans } from "@/lib/billing";
import { absoluteUrl } from "@/lib/site";

// What a preview looks like wherever it is listed or opened.
export type PreviewRow = {
    business_id: string;
    token: string;
    contact_name: string | null;
    contact_email: string | null;
    contacted_at: string | null;
    instagram_handle: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    view_count: number;
    last_viewed_at: string | null;
    claimed_at: string | null;
    businesses: {
        name: string;
        approval_status: string;
        logo_url: string | null;
        cover_image_url: string | null;
        business_locations: { city: string | null; region: string | null; cities: { name: string } | null }[];
    } | null;
};

export const previewColumns =
    "business_id, token, contact_name, contact_email, contacted_at, instagram_handle, status, notes, created_at, view_count, last_viewed_at, claimed_at, businesses ( name, approval_status, logo_url, cover_image_url, business_locations ( city, region, cities ( name ) ) )";

// Signed by a real name where there is one. A DM from a brand account
// signed "The Promotello team" reads worse than one signed by nobody.
export const DEFAULT_SENDER = "The Promotello team";

export function senderName(fullName: unknown) {
    return typeof fullName === "string" && fullName.trim() ? fullName.trim() : DEFAULT_SENDER;
}

// A cold email signed with a full name reads like a letter from a company.
// Signed with a first name it reads like a person who has done something for
// you, which is what has actually happened.
// Who is writing, and the fact they will find out for themselves the moment
// they open the page: that this is new and small. Said plainly it makes the
// founding price make sense and the rest believable. Not apologised for —
// "we're just starting out, bear with us" is a plea, and nobody buys from
// one.
export function introduction(sender: string, town: string, street: string | null) {
    const who =
        sender === DEFAULT_SENDER
            ? `We're building Promotello here in ${town}`
            : `I'm ${sender.trim().split(/\s+/)[0]} — I'm building Promotello here in ${town}`;

    return street ? `${who}. It's new, and I'm starting with ${street}.` : `${who}, and it's new.`;
}

export function signOff(sender: string) {
    if (sender === DEFAULT_SENDER) {
        return ["Thanks,", DEFAULT_SENDER];
    }

    return ["Cheers,", sender.trim().split(/\s+/)[0]];
}

export const statusLabels: Record<string, string> = {
    to_send: "Not emailed",
    sent: "Emailed",
    replied: "Replied",
    not_interested: "Not interested",
};

// What to offer next, given where it is.
export const nextStatuses: Record<string, { value: string; label: string }[]> = {
    to_send: [{ value: "sent", label: "Mark emailed" }],
    sent: [
        { value: "replied", label: "Replied" },
        { value: "not_interested", label: "Not interested" },
        { value: "to_send", label: "Not emailed after all" },
    ],
    replied: [{ value: "not_interested", label: "Not interested" }],
    not_interested: [{ value: "sent", label: "Back to emailed" }],
};

export function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(
        new Date(value),
    );
}

export function previewPath(businessId: string) {
    return `/admin/previews/${businessId}`;
}

// Accepts whatever is to hand: a bare handle, an @handle, or a profile URL
// copied out of the address bar. Returns the bare lowercase handle the column
// stores, or null if it could not be read as one.
export function instagramHandle(raw: string | null | undefined) {
    if (!raw) return null;

    let value = raw.trim();

    // A pasted profile link is the commonest way this arrives.
    const fromUrl = value.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i);
    if (fromUrl) value = fromUrl[1];

    value = value.replace(/^@+/, "").trim();

    return /^[a-zA-Z0-9._]{1,30}$/.test(value) ? value.toLowerCase() : null;
}

// Instagram's own message link: opens the thread in the app on a phone, and
// the web inbox on a desktop.
export function instagramDmUrl(handle: string) {
    return `https://ig.me/m/${handle}`;
}

// The subject line. It leads with something that already exists and with
// their own business, because a cold email is read or deleted on this line
// alone.
//
// Not "your loyalty card is ready": that is the line every stamp-card app
// sends, and it invites the comparison we lose. A page is the thing they
// don't already have an email about.
export function outreachSubject(preview: PreviewRow) {
    return `Your Promotello page is ready, ${preview.businesses?.name ?? "your business"}`;
}

// The message to send with the link, by email or a DM. It opens with what has
// been built for them rather than with us, names the two objections that stop
// people (an app, a card reader), and gives the founding price a number of
// places left so there is a reason to look today.
//
// The directory comes first and the card second, deliberately. A stamp card
// is something a dozen cheaper apps sell them; customers who have never been
// in are not. See Positioning in docs/ROADMAP.md.
//
// It signs off by name, but carries no company footer: the Companies Act
// disclosure is in the email signature, and sending it twice reads badly.
export function outreachMessage(preview: PreviewRow, sender: string, placesLeft: number | null) {
    const name = preview.businesses?.name ?? "your business";
    const url = absoluteUrl(`/business/preview/${preview.token}`);
    const location = preview.businesses?.business_locations?.[0];
    const town = location?.cities?.name ?? location?.city?.trim();
    const where = town ? ` ${town}` : "";
    const street = location?.region?.trim() || null;

    const offer = `The first ${FOUNDING_MEMBER_LIMIT}${where} businesses get Pro at ${plans.pro_founding_monthly.price} a month for life instead of ${plans.pro_monthly.price}, and the first ${TRIAL_DAYS} days are free.`;

    // Saying "50 of 50 left" tells them nobody has taken it, so the count
    // only appears once some have gone.
    const founding =
        placesLeft === null || placesLeft <= 0
            ? `Pro is ${plans.pro_monthly.price} a month and the first ${TRIAL_DAYS} days are free.`
            : placesLeft < FOUNDING_MEMBER_LIMIT
              ? `${offer} ${placesLeft} of the ${FOUNDING_MEMBER_LIMIT} places are left.`
              : offer;

    return [
        `Hi ${preview.contact_name || "there"},`,
        "",
        `I've built ${name} a page on Promotello, so you can look at it rather than read about it:`,
        "",
        url,
        "",
        introduction(sender, town || "Bristol", street),
        "",
        `It works from day one with the customers you already have: a stamp card they keep on their phone, a QR poster for your window, and your offers on a page that's yours. The more of ${street || town || "Bristol"} joins, the more people find you through the directory too — and your card is on your page, so someone can join it before they have ever been in.`,
        "",
        "No app for customers to download and no card reader. Staff stamp a card by scanning it with their own phone, so nobody can stamp their own.",
        "",
        `It's free to use with one offer. ${founding}`,
        "",
        `Worth a look? Claiming it takes about two minutes. If it's not for you, reply "no thanks" and I won't email again.`,
        "",
        ...signOff(sender),
    ].join("\n");
}

// Instagram, for the businesses that have an account but no address worth
// writing to — or no address at all. A DM is read on a phone in a second, so
// this is the same argument as the email at about half the length, with no
// subject and no signature.
//
// A DM is electronic mail under PECR exactly as an email is, so the sole
// trader rule applies here too: it is not a way round a business that cannot
// be emailed.
export function outreachDm(preview: PreviewRow, sender: string, placesLeft: number | null) {
    const name = preview.businesses?.name ?? "your business";
    const url = absoluteUrl(`/business/preview/${preview.token}`);
    const location = preview.businesses?.business_locations?.[0];
    const town = location?.cities?.name ?? location?.city?.trim();
    const where = town ? ` ${town}` : "";
    const street = location?.region?.trim() || null;

    // Kept separate from the email's version on purpose: one sentence here,
    // and the count again only once places have actually gone.
    const founding =
        placesLeft === null || placesLeft <= 0
            ? `It's free with one offer, and Pro is ${plans.pro_monthly.price} a month with the first ${TRIAL_DAYS} days free.`
            : `It's free with one offer, and the first ${FOUNDING_MEMBER_LIMIT}${where} businesses get Pro at ${plans.pro_founding_monthly.price} a month for life instead of ${plans.pro_monthly.price}.${placesLeft < FOUNDING_MEMBER_LIMIT ? ` ${placesLeft} places left.` : ""}`;

    return [
        `Hi${preview.contact_name ? ` ${preview.contact_name}` : ""}! I've built ${name} a page on Promotello — easier to look at than to explain:`,
        "",
        url,
        "",
        introduction(sender, town || "Bristol", street),
        "",
        `It works from day one with the customers you already have: a stamp card on their phone and a QR poster for your window, plus a page in the${where || " Bristol"} directory that gets better as more of the street joins. No app for them to download and no card reader.`,
        "",
        founding,
        "",
        `Worth a look? Claiming it takes about two minutes. If it's not for you, just say and I won't message again.`,
        // One line in a DM: "Cheers," on its own looks like a stray message.
        ...(sender === DEFAULT_SENDER ? [] : ["", `— ${sender.trim().split(/\s+/)[0]}`]),
    ].join("\n");
}
