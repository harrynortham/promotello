// What the backfill made of every offer's headline, so a person can read
// the result rather than trusting the regexes.
//
//   node --env-file=.env.local scripts/offer-kinds-report.mjs
//   node --env-file=.env.local scripts/offer-kinds-report.mjs --other
//
// --other lists only the ones no rule could read: those are the offers an
// admin sets a type for by hand, from /admin/offers/<id>.
//
// Reads with SUPABASE_SERVICE_ROLE_KEY and writes nothing.

import { createClient } from "@supabase/supabase-js";

import { OFFER_KINDS, guessKind, offerHeadline } from "../lib/offer-kinds.ts";

const onlyOther = process.argv.includes("--other");

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await supabase
    .from("offers")
    .select("discount, kind, kind_value, kind_quantity, kind_item, businesses ( name, is_sample )")
    .order("kind")
    .order("discount");

if (error) {
    console.error(`Could not read the offers: ${error.message}`);
    process.exit(1);
}

function parts(offer) {
    return [
        offer.kind_value === null ? null : `value ${offer.kind_value}`,
        offer.kind_quantity === null ? null : `quantity ${offer.kind_quantity}`,
        offer.kind_item === null ? null : `item "${offer.kind_item}"`,
    ]
        .filter(Boolean)
        .join(", ") || "nothing else";
}

const rows = data.filter((offer) => !onlyOther || offer.kind === "other");
const width = Math.max(...rows.map((offer) => offer.discount.length), 10);

for (const offer of rows) {
    const business = Array.isArray(offer.businesses) ? offer.businesses[0] : offer.businesses;

    console.log(
        `${offer.discount.padEnd(width)}  →  ${offer.kind.padEnd(12)} ${parts(offer)}` +
        `${business?.is_sample ? "  (sample)" : ""}  ${business?.name ?? ""}`,
    );
}

console.log(`\n${rows.length} of ${data.length} offers\n`);

for (const spec of OFFER_KINDS) {
    const count = data.filter((offer) => offer.kind === spec.kind).length;
    if (count) console.log(`${String(count).padStart(4)}  ${spec.label}`);
}

// The columns are what the rules read out of the headline, and the
// headline is what the form would write from the columns. A row where
// either disagrees is one to look at: it was classified before the rules
// changed, or set by hand to something the form could not produce.
const odd = data.filter((offer) => {
    const guess = guessKind(offer.discount);
    const rebuilt = offerHeadline({
        kind: offer.kind,
        value: offer.kind_value,
        quantity: offer.kind_quantity,
        item: offer.kind_item,
        text: offer.discount,
    });

    return guess.kind !== offer.kind || rebuilt !== offer.discount;
});

if (odd.length) {
    console.log(`\n${odd.length} to look at — the type and the headline don't agree:`);

    for (const offer of odd) {
        console.log(`  "${offer.discount}" is saved as ${offer.kind}, ${parts(offer)}`);
    }
}
