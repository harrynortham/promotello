// Which offers still say something the pickers didn't write.
//
//   node --env-file=.env.local scripts/offer-availability-report.mjs
//   node --env-file=.env.local scripts/offer-availability-report.mjs --all
//
// Availability was free text, and the backfill only rewrote the three
// ways of saying "any time". Everything else kept the words its business
// typed — "Weekdays before 10am", "First visit only", "While stocks
// last" — and has no days, times or audience behind it.
//
// There is no flag for that: an offer is legacy when its stored line
// isn't the one its columns would write. This lists them, so they can be
// answered from /admin/offers/<id> or by the business the next time it
// edits the offer. --all lists every offer, legacy or not.
//
// Reads with SUPABASE_SERVICE_ROLE_KEY and writes nothing.

import { createClient } from "@supabase/supabase-js";

import { availabilityLine, isLegacyAvailability } from "../lib/schedule.ts";

const showAll = process.argv.includes("--all");

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await supabase
    .from("offers")
    .select(
        "id, title, availability, available_days, available_from, available_until, audience, schedule_days, businesses ( name, is_sample )",
    )
    .order("availability");

if (error) {
    console.error(`Could not read the offers: ${error.message}`);
    process.exit(1);
}

function partsOf(offer) {
    return {
        days: offer.available_days,
        from: offer.available_from,
        until: offer.available_until,
        audience: offer.audience,
    };
}

const rows = data.filter((offer) => showAll || isLegacyAvailability(offer.availability, partsOf(offer)));
const width = Math.max(...rows.map((offer) => offer.availability.length), 10);

for (const offer of rows) {
    const business = Array.isArray(offer.businesses) ? offer.businesses[0] : offer.businesses;
    const built = availabilityLine(partsOf(offer));

    console.log(
        `${offer.availability.padEnd(width)}  →  ${built.padEnd(width)}` +
        `${offer.schedule_days ? "  (enforced at the till)" : ""}` +
        `${business?.is_sample ? "  (sample)" : ""}  ${business?.name ?? ""} · ${offer.title}`,
    );
}

const legacy = data.filter((offer) => isLegacyAvailability(offer.availability, partsOf(offer)));

console.log(
    `\n${legacy.length} of ${data.length} offers still say something the pickers didn't write.` +
    `${showAll ? "" : " Run with --all to see the rest."}`,
);

// The ones whose words the pickers can reproduce exactly: answering them
// changes nothing a customer would notice, which makes them the easy
// ones to tidy first.
const sayable = legacy.filter((offer) => sameAsSomePicker(offer.availability));

if (sayable.length) {
    console.log(`\n${sayable.length} of those are a line the pickers can write word for word:`);

    for (const offer of sayable) {
        console.log(`  "${offer.availability}"  ${offer.title}`);
    }
}

// Every line the pickers can produce from days alone, with or without an
// audience. Days-and-times lines are left out: there are too many, and a
// time has to be read out of the words to match one.
function sameAsSomePicker(availability) {
    const everyDay = [0, 1, 2, 3, 4, 5, 6];
    const sets = [null, ...everyDay.map((day) => [day]), [1, 2, 3, 4, 5], [6, 0]];

    return sets.some((days) =>
        ["everyone", "new_customers"].some(
            (audience) => availabilityLine({ days, audience }) === availability.trim(),
        ),
    );
}
