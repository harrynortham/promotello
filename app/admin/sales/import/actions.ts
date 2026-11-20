"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    EXTRA_TRADES,
    areaViewport,
    inTheArea,
    placesQuery,
    searchPlacesReportingLimit,
    splitViewport,
    tradesForCategory,
} from "@/lib/google-places";
import { findContactDetails } from "@/lib/lead-jobs";
import { compare, splitAddress } from "@/lib/lead-enrichment";
import { createClient } from "@/utils/supabase/server";

const IMPORT = "/admin/sales/import";

// How long a sweep gives itself before stopping and saying where it
// got to.
//
// Vercel's ceiling for a Node function is five minutes, and a sweep of
// every trade is longer than that. Being killed at the ceiling loses
// the redirect and leaves the page spinning, so this stops short of it
// on purpose: what was found is already saved, the page says how many
// trades are left, and pressing again carries on — a place_id already
// held is skipped, so nothing is paid for twice.
const ACTION_BUDGET_MS = 240_000;

// Everything in a table, a thousand at a time.
//
// PostgREST stops at max_rows, which is 1000 here, and says nothing
// about it: a select of 1100 rows returns 1000 and looks complete.
// The sweep's dedupe read every lead and every business that way, so
// past a thousand it quietly went blind to the oldest of them and
// started offering businesses that were already leads.
async function everyRow<T>(
    read: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
) {
    const PAGE = 1000;
    const all: T[] = [];

    for (let from = 0; ; from += PAGE) {
        const { data } = await read(from, from + PAGE - 1);
        const batch = data ?? [];

        all.push(...batch);

        if (batch.length < PAGE) return all;
    }
}

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

    // Before anything is billed. Without this the key being unset is
    // swallowed by the per-trade catch below — fifty throws, fifty
    // continues, and a redirect reading "found 0 businesses in 0
    // billed searches", which is what an empty street looks like too.
    if (!process.env.GOOGLE_PLACES_API_KEY) {
        redirect(`${IMPORT}?area=${area.id}&error=no_key`);
    }

    const city = Array.isArray(area.cities) ? area.cities[0] : area.cities;

    const [{ data: categories }, leadNames, businessNames] = await Promise.all([
        supabase
            .from("categories")
            .select("id, name")
            .not("parent_id", "is", null)
            .eq("is_active", true)
            .order("name"),
        // Paged, because there will be more than a thousand leads.
        everyRow<{ name: string }>((from, to) =>
            supabase.from("leads").select("name").range(from, to),
        ),
        everyRow<{ name: string }>((from, to) =>
            supabase.from("businesses").select("name").range(from, to),
        ),
    ]);

    // Names are compared the way the lead form already compares them,
    // so "The Anchor" and "the anchor" are one business. This is the
    // only way to notice somebody already on Promotello that we have
    // never held a place_id for — and writing to them to ask them to
    // join it is the mistake worth most.
    const heldNames = new Set([
        ...leadNames.map((row) => compare(row.name)),
        ...businessNames.map((row) => compare(row.name)),
    ]);

    // place_id is asked about rather than loaded. Sixty ids a trade is
    // a question the database can answer exactly, and no row limit can
    // make the answer quietly wrong.
    const alreadyHeld = async (ids: string[]) => {
        if (ids.length === 0) return new Set<string>();

        const [{ data: candidates }, { data: asLeads }] = await Promise.all([
            supabase.from("lead_candidates").select("place_id").in("place_id", ids),
            supabase.from("leads").select("place_id").in("place_id", ids),
        ]);

        return new Set([
            ...(candidates ?? []).map((row) => row.place_id),
            ...(asLeads ?? []).map((row) => row.place_id).filter(Boolean),
        ]);
    };

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
        // A ticked category becomes the words Google understands for
        // it, all still tagged with that category. "Home & gifts" as a
        // search found one business on Gloucester Road; "gift shop",
        // "homeware", "home goods store" and "furniture shop" found
        // twenty-six.
        ...(categories ?? [])
            .filter((category) => wanted.has(`ours:${category.id}`))
            .flatMap((category) =>
                tradesForCategory(category.name).map((name) => ({
                    name,
                    categoryId: category.id,
                })),
            ),
        ...EXTRA_TRADES.filter((name) => wanted.has(`trade:${name}`)).map((name) => ({
            name,
            categoryId: null,
        })),
    ];

    const startedAt = Date.now();

    let found = 0;
    let searched = 0;
    let failed = 0;
    let requests = 0;
    // Trades where Google returned its full sixty, which almost
    // certainly means there were more it would not give.
    const capped: string[] = [];

    for (const trade of trades) {
        // Stopped rather than cut off. The ones already written stay,
        // and the page says how many are left.
        if (Date.now() - startedAt > ACTION_BUDGET_MS) break;

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
            failed += 1;
            continue;
        }

        searched += 1;

        const rows: Record<string, unknown>[] = [];

        // Google reads the area as a hint rather than a boundary: a
        // sweep of Gloucester Road came back 747 businesses and 313
        // were on it. Importing the rest would bury the street in its
        // own city.
        const here = results.filter((place) => inTheArea(place.address, area.name, city?.name));
        const held = await alreadyHeld(here.map((place) => place.placeId));

        for (const place of here) {
            if (held.has(place.placeId)) continue;
            if (heldNames.has(compare(place.name))) continue;

            held.add(place.placeId);

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
    // The names travel whole, because the button that asks them again
    // needs to know which they were — a preview would not do.
    const cappedNote =
        capped.length > 0
            ? `&capped=${encodeURIComponent(capped.join("|"))}&cappedCount=${capped.length}`
            : "";

    // Two different unfinished. One ran out of time and can be asked
    // again; the other was refused by Google and asking again does the
    // same thing, so they are counted apart.
    const unfinished = trades.length - searched - failed;
    const leftNote = unfinished > 0 ? `&left=${unfinished}` : "";
    const failedNote = failed > 0 ? `&failed=${failed}` : "";

    redirect(
        `${IMPORT}?area=${area.id}&swept=${found}&trades=${searched}&calls=${requests}${cappedNote}${leftNote}${failedNote}`,
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

// Ask the capped trades again, half a street at a time.
//
// Sixty is Google's ceiling for one query and there is no page four,
// so a trade that came back full has been cut off and no button can
// continue it. What can be done is ask a smaller question: the same
// search over the north half and the south half of Gloucester Road
// returned 98 businesses between them where one query returned 60.
//
// Only the trades that were capped, because the rest were complete and
// asking again is money for nothing.
export async function deepenSweep(formData: FormData) {
    const supabase = await adminClient();
    const areaId = String(formData.get("areaId") ?? "");
    const trades = formData.getAll("cappedTrade").map(String).filter(Boolean);

    const { data: area } = await supabase
        .from("areas")
        .select("id, name, cities ( name )")
        .eq("id", areaId)
        .maybeSingle();

    if (!area || trades.length === 0) redirect(`${IMPORT}?area=${areaId}&error=no_trades`);

    const city = Array.isArray(area.cities) ? area.cities[0] : area.cities;
    const cityName = city?.name ?? "Bristol";

    const viewport = await areaViewport(`${area.name}, ${cityName}`);

    if (!viewport) redirect(`${IMPORT}?area=${areaId}&error=no_viewport`);

    if (!process.env.GOOGLE_PLACES_API_KEY) {
        redirect(`${IMPORT}?area=${areaId}&error=no_key`);
    }

    // How finely to cut. Two the first time, and the page offers to
    // double it while anything is still coming back full — a band that
    // returns sixty is as truncated as the whole street was, and
    // without saying so the sweep looks finished when it is not.
    //
    // Eight is the ceiling. Each band is a full search of every capped
    // trade, so the bill doubles with it, and by eight the bands are a
    // couple of hundred metres of street — past that the answer is a
    // narrower trade, not a smaller box.
    const asked = Number(formData.get("bands")) || 2;
    const howMany = Math.min(Math.max(asked, 2), 8);
    const bands = splitViewport(viewport, howMany);

    // The same two rules as the sweep, for the same reasons: names read
    // completely rather than to the first thousand, and place_ids asked
    // about rather than loaded.
    const [leadNames, businessNames] = await Promise.all([
        everyRow<{ name: string }>((from, to) =>
            supabase.from("leads").select("name").range(from, to),
        ),
        everyRow<{ name: string }>((from, to) =>
            supabase.from("businesses").select("name").range(from, to),
        ),
    ]);

    const heldNames = new Set([
        ...leadNames.map((row) => compare(row.name)),
        ...businessNames.map((row) => compare(row.name)),
    ]);

    const alreadyHeld = async (ids: string[]) => {
        if (ids.length === 0) return new Set<string>();

        const [{ data: candidates }, { data: asLeads }] = await Promise.all([
            supabase.from("lead_candidates").select("place_id").in("place_id", ids),
            supabase.from("leads").select("place_id").in("place_id", ids),
        ]);

        return new Set([
            ...(candidates ?? []).map((row) => row.place_id),
            ...(asLeads ?? []).map((row) => row.place_id).filter(Boolean),
        ]);
    };

    const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .not("parent_id", "is", null);

    let found = 0;
    let requests = 0;
    // Trades where a band came back full. Still truncated, however
    // finely it has been cut.
    const stillCapped = new Set<string>();

    for (const trade of trades) {
        const ours = (categories ?? []).find((category) => category.name === trade);

        for (const band of bands) {
            let results;

            try {
                const answer = await searchPlacesReportingLimit(
                    placesQuery(trade, area.name, cityName),
                    {
                        within: band,
                        onRequest: () => {
                            requests += 1;
                        },
                    },
                );

                results = answer.places;

                if (answer.hitTheLimit) stillCapped.add(trade);
            } catch {
                continue;
            }

            const rows: Record<string, unknown>[] = [];

            const here = results.filter((place) => inTheArea(place.address, area.name, cityName));
            const held = await alreadyHeld(here.map((place) => place.placeId));

            for (const place of here) {
                if (held.has(place.placeId)) continue;
                if (heldNames.has(compare(place.name))) continue;

                held.add(place.placeId);

                rows.push({
                    place_id: place.placeId,
                    area_id: area.id,
                    category_id: ours?.id ?? null,
                    website: place.website,
                    cached_name: place.name,
                    cached_address: place.address,
                });
            }

            if (rows.length > 0) {
                const { error } = await supabase
                    .from("lead_candidates")
                    .upsert(rows, { onConflict: "place_id", ignoreDuplicates: true });

                if (!error) found += rows.length;
            }
        }
    }

    revalidatePath(IMPORT);

    // Said plainly either way. "Found 30 more" with nothing else reads
    // as finished, and the one thing worth knowing is whether it is.
    const more =
        stillCapped.size > 0
            ? `&capped=${encodeURIComponent([...stillCapped].join("|"))}&cappedCount=${stillCapped.size}&bands=${howMany}`
            : "";

    redirect(
        `${IMPORT}?area=${area.id}&deepened=${found}&trades=${trades.length}&calls=${requests}&split=${howMany}${more}`,
    );
}
