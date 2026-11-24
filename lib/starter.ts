import type { SupabaseClient } from "@supabase/supabase-js";

// What we put in their email, handed back to them.
//
// A preview email shows a business one specific offer and one specific
// reward. Until now those were decoration: the business arrived at an
// empty dashboard and a seven-step checklist, and had to invent the
// thing it had just said yes to (docs/LAUNCH-FUNNEL.md).
//
// Nothing here writes a row. An offer needs a description, terms and an
// end date, and inventing those would publish words the business never
// wrote on a page with its name on it. What it does is carry the two
// lines forward, so the dashboard can say "this is the offer from your
// email" and the forms can open with it already in.
//
// Pure apart from `readStarter`, so the rules are tested without a
// database (tests/unit/starter.test.ts).

export type Starter = {
    offer: string | null;
    reward: string | null;
    stamps: number | null;
};

// What a business signed up without a preview has: nothing, and no card
// in its way.
export const NO_STARTER: Starter = { offer: null, reward: null, stamps: null };

const MAX_OFFER = 80;
const MAX_REWARD = 60;

// The card builder's own range, and the card we draw when one is asked
// for without a number on it.
export const STAMPS_MIN = 3;
export const STAMPS_MAX = 20;
export const DEFAULT_STAMPS = 9;

function inRange(stamps: number) {
    return Number.isInteger(stamps) && stamps >= STAMPS_MIN && stamps <= STAMPS_MAX;
}

// The three columns as the two places that write them should write
// them: building a preview, and changing the examples on one already
// built. Both clamped and truncated by hand, which is how two write
// paths drift from the rules readStarterRow reads them back by.
export function sampleValues(offer: string, reward: string, stamps: number) {
    return {
        sample_offer: offer.slice(0, MAX_OFFER),
        sample_reward: reward.slice(0, MAX_REWARD),
        sample_stamps: inRange(stamps) ? stamps : DEFAULT_STAMPS,
    };
}

function tidy(value: unknown, max: number) {
    if (typeof value !== "string") return null;

    const text = value.trim().slice(0, max);
    return text === "" ? null : text;
}

export function readStarterRow(row: unknown): Starter {
    const held = (Array.isArray(row) ? row[0] : row) as
        | { sample_offer?: unknown; sample_reward?: unknown; sample_stamps?: unknown }
        | null
        | undefined;

    if (!held) return NO_STARTER;

    const stamps = Number(held.sample_stamps);

    return {
        offer: tidy(held.sample_offer, MAX_OFFER),
        reward: tidy(held.sample_reward, MAX_REWARD),
        // Anything outside the range was never a card we would have
        // drawn.
        stamps: inRange(stamps) ? stamps : null,
    };
}

export async function readStarter(supabase: SupabaseClient, businessId: string): Promise<Starter> {
    const { data, error } = await supabase.rpc("business_starter_suggestions", {
        requested_business_id: businessId,
    });

    // A business that was never a preview has no row, and a failure here
    // is a prompt nobody sees rather than a page that breaks.
    if (error) {
        console.error("Could not read the starter suggestions", error);
        return NO_STARTER;
    }

    return readStarterRow(data);
}

// Which halves are still worth offering. Once a business has written its
// own offer, ours is a worse version of a thing it has already done —
// and the prompt that kept showing would read as us not noticing.
export function starterToShow(
    starter: Starter,
    { hasOffer, hasLoyalty }: { hasOffer: boolean; hasLoyalty: boolean },
) {
    const offer = !hasOffer && starter.offer !== null ? starter.offer : null;
    const card = !hasLoyalty && starter.reward !== null
        ? { reward: starter.reward, stamps: starter.stamps ?? DEFAULT_STAMPS }
        : null;

    return { offer, card, any: offer !== null || card !== null };
}
