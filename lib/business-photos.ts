// Photos of the place, on a business page.
//
// The numbers here must match public.photo_plan_limit() in
// 20270222090000. The form reads them so the Add button can be
// disabled before anybody tries, and the database enforces them,
// because a limit that only exists in a React component is a limit
// anybody can step round with a fetch.
export const FREE_PHOTO_LIMIT = 5;
export const PRO_PHOTO_LIMIT = 25;

export function photoLimit(hasPro: boolean) {
    return hasPro ? PRO_PHOTO_LIMIT : FREE_PHOTO_LIMIT;
}

// What the database raises when the limit is reached, so the page can
// say the same thing rather than showing a Postgres error.
export const PHOTO_LIMIT_CODE = "P0004";

export type BusinessPhoto = {
    id: string;
    storage_path: string;
    caption: string | null;
    sort_order: number;
    plan_paused_at?: string | null;
};

// The words under a photo for somebody who cannot see it.
//
// A caption when there is one. Otherwise the business and the position,
// because "image" repeated nine times tells a screen reader nothing,
// and the position at least matches what a sighted person is being
// told by the grid.
export function photoAlt(photo: Pick<BusinessPhoto, "caption">, businessName: string, index: number) {
    const caption = photo.caption?.trim();

    return caption || `${businessName}, photo ${index + 1}`;
}

// Where a photo moved to, as the rows to write.
//
// Returned rather than applied, so the page can show the new order
// immediately and the write can be checked against exactly what was
// shown. Every position is renumbered from zero: gaps and ties are how
// a list ends up in a different order on the next load than the one
// somebody just dragged it into.
export function reordered(photos: BusinessPhoto[], from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= photos.length || to >= photos.length) {
        return photos.map((photo, at) => ({ ...photo, sort_order: at }));
    }

    const moved = [...photos];
    const [lifted] = moved.splice(from, 1);

    moved.splice(to, 0, lifted);

    return moved.map((photo, at) => ({ ...photo, sort_order: at }));
}

// The public url for a stored path. One place, so the bucket is named
// once.
export const PHOTO_BUCKET = "business-logos";

export function photoUrl(supabaseUrl: string, path: string) {
    return `${supabaseUrl}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}
