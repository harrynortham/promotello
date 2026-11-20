"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    EXTRA_TRADES,
    inTheArea,
    placesQuery,
    searchPlacesReportingLimit,
} from "@/lib/google-places";
import { findContactDetails } from "@/lib/lead-jobs";
import { compare, splitAddress } from "@/lib/lead-enrichment";
import { createClient } from "@/utils/supabase/server";

const IMPORT = "/admin/sales/import";

async function adminClient() {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) redirect("/admin");

    return supabase;
}

// Sweep an area: one Text Search a trade, because Google gives at most
// sixty results a query and a street has more businesses than that on
// it.
//
// Everything already known is skipped before it is written: a place_id
// we hold, and a name already on a lead or a live business. The second
// is the one that matters — writing to somebody already on Promotello
// to ask them to join it.
export async function sweepArea(formData: FormData) {
    const supabase = await adminClient();
    const areaId = String(formData.get("areaId") ?? "");

    const { data: area } = await supabase
        .from("areas")
        .select("id, name, cities ( name )")
        .eq("id", areaId)
        .maybeSingle();

    if (!area) redirect(`${IMPORT}?error=no_area`);

    const city = Array.isArray(area.cities) ? area.cities[0] : area.cities;

    const [{ data: categories }, { data: known }, { data: leads }, { data: businesses }] =
        await Promise.all([
            supabase
                .from("categories")
                .select("id, name")
                .not("parent_id", "is", null)
                .eq("is_active", true)
                .order("name"),
            supabase.from("lead_candidates").select("place_id"),
            supabase.from("leads").select("name, place_id"),
            supabase.from("businesses").select("name"),
        ]);

    const heldPlaceIds = new Set([
        ...(known ?? []).map((row) => row.place_id),
        ...(leads ?? []).map((row) => row.place_id).filter(Boolean),
    ]);

    // Names are compared the way the lead form already compares them,
    // so "The Anchor" and "the anchor" are one business.
    const heldNames = new Set([
        ...(leads ?? []).map((row) => compare(row.name)),
        ...(businesses ?? []).map((row) => compare(row.name)),
    ]);

    // Which trades to ask about. The picker submits one field a trade,
    // "ours:<category id>" or "trade:<name>".
    //
    // Nothing submitted is refused rather than taken to mean
    // everything. All 183 is around five hundred billed searches, and
    // an empty form is the easiest way to arrive at it by accident —
    // which is exactly the press nobody should be one slip away from.
    //
    // A Google trade has no category of ours, so the lead is made
    // without one and whoever decides it is worth writing to picks one
    // then.
    const wanted = new Set(formData.getAll("trade").map(String));

    if (wanted.size === 0) {
        redirect(`${IMPORT}?area=${area.id}&error=no_trades`);
    }

    const trades: { name: string; categoryId: string | null }[] = [
        ...(categories ?? [])
            .filter((category) => wanted.has(`ours:${category.id}`))
            .map((category) => ({ name: category.name, categoryId: category.id })),
        ...EXTRA_TRADES.filter((name) => wanted.has(`trade:${name}`)).map((name) => ({
            name,
            categoryId: null,
        })),
    ];

    let found = 0;
    let searched = 0;
    let requests = 0;
    // Trades where Google returned its full sixty, which almost
    // certainly means there were more it would not give.
    const capped: string[] = [];

    for (const trade of trades) {
        let results;

        try {
            const answer = await searchPlacesReportingLimit(
                placesQuery(trade.name, area.name, city?.name ?? "Bristol"),
                {
                    onRequest: () => {
                        requests += 1;
                    },
                },
            );

            results = answer.places;

            if (answer.hitTheLimit) capped.push(trade.name);
        } catch {
            // One trade failing is not a reason to lose the rest of the
            // sweep: the ones already found are still worth having.
            continue;
        }

        searched += 1;

        const rows: Record<string, unknown>[] = [];

        for (const place of results) {
            // Google reads the area as a hint rather than a boundary: a
            // sweep of Gloucester Road came back 747 businesses and 313
            // were on it. Importing the rest would bury the street in
            // its own city.
            if (!inTheArea(place.address, area.name, city?.name)) continue;
            if (heldPlaceIds.has(place.placeId)) continue;
            if (heldNames.has(compare(place.name))) continue;

            heldPlaceIds.add(place.placeId);

            rows.push({
                place_id: place.placeId,
                area_id: area.id,
                category_id: trade.categoryId,
                website: place.website,
                cached_name: place.name,
                cached_address: place.address,
            });
        }

        // Written as the sweep goes rather than banked to the end.
        //
        // Banking it meant a sweep that died — a dev server restarted
        // under it, a timeout, a closed tab — threw away everything it
        // had already paid Google for, and showed nothing at all while
        // it ran. One trade's worth is a small write and the work is
        // kept.
        if (rows.length > 0) {
            // Ignores anything an earlier sweep inserted first.
            const { error } = await supabase.from("lead_candidates").upsert(rows, {
                onConflict: "place_id",
                ignoreDuplicates: true,
            });

            if (!error) found += rows.length;
        }
    }

    revalidatePath(IMPORT);
    const cappedNote = capped.length > 0 ? `&capped=${encodeURIComponent(capped.slice(0, 6).join(", "))}&cappedCount=${capped.length}` : "";

    redirect(
        `${IMPORT}?area=${area.id}&swept=${found}&trades=${searched}&calls=${requests}${cappedNote}`,
    );
}

// One form, two buttons. SubmitButton wraps useFormStatus so it can say
// "Importing…" on the one that was pressed, and a form has one action,
// so which button it was arrives as a field.
export async function handleCandidates(formData: FormData) {
    if (String(formData.get("intent")) === "skip") {
        return skipCandidates(formData);
    }

    return importCandidates(formData);
}

// Turn the ticked candidates into leads, then let the crawler correct
// them.
//
// The lead is created with the Google name because that is the only
// name there is yet. findContactDetails then reads the business's own
// site — a source we may keep — and where it succeeds the address comes
// from there and the borrowed strings are deleted. Where it fails the
// lead keeps the Google name and wants an address typed, which is the
// ten-minute job, now only for the ones that need it.
export async function importCandidates(formData: FormData) {
    const supabase = await adminClient();

    const ids = formData.getAll("candidateId").map(String).filter(Boolean);
    const areaId = String(formData.get("areaId") ?? "");

    if (ids.length === 0) redirect(`${IMPORT}?area=${areaId}&error=none_picked`);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: candidates } = await supabase
        .from("lead_candidates")
        .select("id, place_id, area_id, category_id, website, cached_name, cached_address")
        .in("id", ids)
        .eq("status", "new");

    const { data: area } = await supabase
        .from("areas")
        .select("city_id")
        .eq("id", areaId)
        .maybeSingle();

    let made = 0;
    let crawled = 0;
    const failures: string[] = [];

    for (const candidate of candidates ?? []) {
        if (!candidate.cached_name) continue;

        // No Google address goes onto the lead.
        //
        // 20270202090000 allowed address_source = 'places' for exactly
        // that, and 20270204090000 deleted every one and took the value
        // out of the check constraint, saying why: "there is no route
        // that turns one into ours, so they go rather than sit there
        // looking decided", and "the source can no longer say 'places',
        // so nothing can put one back without this migration being read
        // first". Which is what happened here — the constraint refused
        // the insert and sent me to read it.
        //
        // So the candidate keeps Google's address, in one place with
        // one expiry, and the lead's address comes from the crawler or
        // from somebody typing it.
        const { data: lead, error } = await supabase
            .from("leads")
            .insert({
                name: candidate.cached_name,
                place_id: candidate.place_id,
                website: candidate.website,
                area_id: candidate.area_id,
                city_id: area?.city_id ?? null,
                category_id: candidate.category_id,
                created_by: user?.id ?? null,
            })
            .select("id")
            .single();

        if (error || !lead) {
            // Swallowed, this is a sweep that reports "0 leads made"
            // and no reason — which is how the constraint above cost
            // an hour.
            failures.push(`${candidate.cached_name}: ${error?.message ?? "no row returned"}`);
            continue;
        }

        made += 1;

        // The same call the lead page's "Read their site" button makes.
        const found = await findContactDetails(candidate.website);
        const address = found.address ? splitAddress(found.address) : null;

        if (found.email || address?.line1) {
            await supabase
                .from("leads")
                .update({
                    ...(found.email
                        ? {
                              email: found.email,
                              email_source: found.source,
                              email_found_at: new Date().toISOString(),
                          }
                        : {}),
                    // Their own published address replaces Google's,
                    // in the same shape enrichLead writes it.
                    ...(address?.line1
                        ? {
                              address_line_1: address.line1,
                              ...(address.postcode ? { postcode: address.postcode } : {}),
                              address_source: "website",
                              address_found_at: new Date().toISOString(),
                          }
                        : {}),
                })
                .eq("id", lead.id);

            if (address?.line1) crawled += 1;
        }

        await supabase
            .from("lead_candidates")
            .update({
                status: "imported",
                lead_id: lead.id,
                // Read, used, and no longer ours to hold. The place_id
                // stays and is what stops the next sweep offering this
                // business again.
                // Kept only while it is still the only address there
                // is: somebody typing it in needs to read it. Gone the
                // moment the crawler finds theirs, and gone after
                // thirty days either way.
                cached_name: address?.line1 ? null : candidate.cached_name,
                cached_address: address?.line1 ? null : candidate.cached_address,
            })
            .eq("id", candidate.id);
    }

    revalidatePath(IMPORT);
    revalidatePath("/admin/sales");
    const failed = failures.length > 0 ? `&failed=${encodeURIComponent(failures[0].slice(0, 120))}` : "";

    redirect(`${IMPORT}?area=${areaId}&made=${made}&crawled=${crawled}${failed}`);
}

// Not wanted. Kept so a later sweep does not offer it again.
export async function skipCandidates(formData: FormData) {
    const supabase = await adminClient();

    const ids = formData.getAll("candidateId").map(String).filter(Boolean);
    const areaId = String(formData.get("areaId") ?? "");

    if (ids.length > 0) {
        await supabase
            .from("lead_candidates")
            .update({ status: "skipped", cached_name: null, cached_address: null })
            .in("id", ids);
    }

    revalidatePath(IMPORT);
    redirect(`${IMPORT}?area=${areaId}&skipped=${ids.length}`);
}
