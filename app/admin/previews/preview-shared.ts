import { FOUNDING_MEMBER_LIMIT, TRIAL_DAYS, plans } from "@/lib/billing";
import { absoluteUrl } from "@/lib/site";

// What a preview looks like wherever it is listed or opened.
export type PreviewRow = {
    business_id: string;
    token: string;
    contact_name: string | null;
    contact_email: string | null;
    contacted_at: string | null;
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
        business_locations: { city: string | null; cities: { name: string } | null }[];
    } | null;
};

export const previewColumns =
    "business_id, token, contact_name, contact_email, contacted_at, status, notes, created_at, view_count, last_viewed_at, claimed_at, businesses ( name, approval_status, logo_url, cover_image_url, business_locations ( city, cities ( name ) ) )";

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

// The subject line. It leads with their own business and with something
// that already exists, because a cold email is read or deleted on this line
// alone.
export function outreachSubject(preview: PreviewRow) {
    return `Your loyalty card is ready, ${preview.businesses?.name ?? "your business"}`;
}

// The message to send with the link, by email or a DM. It opens with what has
// been built for them rather than with us, names the two objections that stop
// people (an app, a card reader), and gives the founding price a number of
// places left so there is a reason to look today.
//
// It signs off by name, but carries no company footer: the Companies Act
// disclosure is in the email signature, and sending it twice reads badly.
export function outreachMessage(preview: PreviewRow, sender: string, placesLeft: number | null) {
    const name = preview.businesses?.name ?? "your business";
    const url = absoluteUrl(`/business/preview/${preview.token}`);
    const location = preview.businesses?.business_locations?.[0];
    const town = location?.cities?.name ?? location?.city?.trim();
    const where = town ? ` ${town}` : "";

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
        `Promotello is for independent businesses in${where || " Bristol"}: a digital loyalty card your customers keep on their phone, a QR poster for your window, and your offers in a directory people search. It is built around turning a first visit into a second one.`,
        "",
        "No app for customers to download and no card reader. Your staff stamp a card by scanning it with their own phone, and you can see how many people come back because of it.",
        "",
        `It's free to use with one offer. ${founding}`,
        "",
        `Worth a look? Claiming it takes about two minutes. If it's not for you, reply "no thanks" and I won't email again.`,
        "",
        sender,
    ].join("\n");
}
