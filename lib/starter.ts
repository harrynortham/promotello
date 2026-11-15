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
        // The card builder's own range. Anything outside it was never a
        // card we would have drawn.
        stamps: Number.isInteger(stamps) && stamps >= 3 && stamps <= 20 ? stamps : null,
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
        ? { reward: starter.reward, stamps: starter.stamps ?? 9 }
        : null;

    return { offer, card, any: offer !== null || card !== null };
}
