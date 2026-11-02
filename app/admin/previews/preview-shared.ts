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

// A message to send with the link, by email or a DM.
export function outreachMessage(preview: PreviewRow, sender: string) {
    const name = preview.businesses?.name ?? "your business";
    const url = absoluteUrl(`/business/preview/${preview.token}`);
    const location = preview.businesses?.business_locations?.[0];
    const town = location?.cities?.name ?? location?.city?.trim();

    return [
        `Hi ${preview.contact_name || "there"},`,
        "",
        `I run Promotello, a loyalty card and offers app for independent businesses${town ? ` in ${town}` : " near you"}. I've set up a preview of ${name} so you can see how it would look: your page, a digital loyalty card and a QR poster for your window.`,
        "",
        url,
        "",
        "It's free to claim, and the Pro plan is free for 30 days. If it's not for you, just ignore this.",
        "",
        sender,
    ].join("\n");
}
