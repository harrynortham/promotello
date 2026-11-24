import type { SupabaseClient } from "@supabase/supabase-js";

// "12 businesses on Gloucester Road are already on here, including The
// Folded Page, Spoke & Chain and Northside Barbers."
//
// This is what replaces ownNumbers() when there is finally something to
// replace it with. That line exists because a cold email from an
// unknown company has no reviews to point at and inventing them is out
// (docs/LAUNCH-FUNNEL.md), so it points at a number the business can
// check for itself instead. A list of their actual neighbours is the
// thing it was standing in for: a business reading it can walk past
// three of them on the way to work.
//
// Counted by area id, never by area name -- Bristol has a City Centre
// and so does Bath (docs/MULTI-CITY.md). The name is only ever shown.

// Two is worse than nothing. "2 businesses on your street are already
// on here" tells a reader this is empty, which is the opposite of what
// the sentence is for, so below this it says nothing and the email
// falls back to what it said before.
export const ENOUGH_NEIGHBOURS = 3;

// How many get named. Enough to be checkable, few enough to read as a
// sentence rather than a directory.
const NAMED = 3;

export type Neighbours = {
    count: number;
    // A few of them, for naming. Ordered by the caller.
    names: string[];
    // The area as people say it: "Gloucester Road".
    areaName: string | null;
};

export function neighboursLine(neighbours: Neighbours | null | undefined): string | null {
    if (!neighbours || neighbours.count < ENOUGH_NEIGHBOURS || !neighbours.areaName) {
        return null;
    }

    const named = neighbours.names.slice(0, NAMED);
    const where = `${neighbours.count} businesses on ${neighbours.areaName} are already on here`;

    if (named.length === 0) {
        return `${where}.`;
    }

    const list = named.length === 1
        ? named[0]
        : `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;

    // Naming all of them is a list; naming some of them is an example.
    return named.length >= neighbours.count
        ? `${where}: ${list}.`
        : `${where}, including ${list}.`;
}

// Who is actually on here, in the same area, right now.
//
// Approved and open and not one of ours: a sample business on the sheet
// would make the whole sentence a lie, and a closed one is not somebody
// you can walk past. The business being written to is left out, because
// a preview is not yet a neighbour and counting it would be counting
// the reader.
export async function neighboursIn(
    admin: SupabaseClient,
    areaId: string | null | undefined,
    exclude: string | null | undefined,
): Promise<Neighbours | null> {
    if (!areaId) {
        return null;
    }

    const { data, error } = await admin
        .from("business_locations")
        .select("business_id, areas ( name ), businesses!inner ( name, approval_status, closed_at, is_sample )")
        .eq("area_id", areaId)
        .eq("businesses.approval_status", "approved")
        .eq("businesses.is_sample", false)
        .is("businesses.closed_at", null);

    if (error || !data) {
        // Said rather than swallowed: the sentence quietly disappearing
        // from outreach is the kind of thing nobody notices for weeks.
        console.error("Neighbours: could not count the area", error);
        return null;
    }

    const rows = data.filter((row) => row.business_id !== exclude);

    const first = rows[0]?.areas;
    const areaName = (Array.isArray(first) ? first[0] : first)?.name ?? null;

    return {
        count: rows.length,
        // Longest-established first would need a join nobody needs; the
        // order the database gives is stable enough for three names.
        names: rows
            .map((row) => (Array.isArray(row.businesses) ? row.businesses[0] : row.businesses)?.name)
            .filter((name): name is string => Boolean(name)),
        areaName,
    };
}
