import type { SupabaseClient, User } from "@supabase/supabase-js";

// Joining a loyalty card happens two ways, and they end the same.
//
// Signed in, the button on the business page does it. Signed out, the
// same button says "Log in to get your card" — both halves of that
// sentence — and carries ?join=1 to the sign-in, which finishes it
// here. Handing the button back to be pressed a second time asks twice
// for the same thing, which is what claiming an offer used to do.
//
// The same shape as lib/claim-offer.ts, because it is the same promise:
// what somebody pressed before signing in is done for them after.

// The business whose card somebody asked for as they signed in, from the
// path they were heading to. A plain business link somebody followed to
// sign in is left alone.
export function cardBeingJoined(next: string) {
    const [path, query = ""] = next.split("?");

    if (!path.startsWith("/businesses/") || new URLSearchParams(query).get("join") !== "1") {
        return null;
    }

    const slug = path.slice("/businesses/".length);

    return /^[a-z0-9-]+$/i.test(slug) ? slug : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Joins the card that business is handing out, unless they are on it
// already. RLS only shows an approved business, and join_loyalty_program()
// checks the rest — switched off, closed to new joiners — so a failure
// here means they land on the business page, which says the same.
//
// The business is named by its slug from its own page, and by its id
// from a scanned poster, which is what record_qr_scan knows it by.
export async function joinLoyaltyCard(supabase: SupabaseClient, slug: string, user: User) {
    const query = supabase.from("businesses").select("id");

    const { data: business } = await (UUID.test(slug)
        ? query.eq("id", slug)
        : query.eq("slug", slug)
    ).maybeSingle();

    if (!business) {
        return { joined: false };
    }

    // The one card taking new joiners, which is the one the page offered.
    const { data: program } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .is("closed_at", null)
        .limit(1)
        .maybeSingle();

    if (!program) {
        return { joined: false };
    }

    const { data: existing } = await supabase
        .from("loyalty_cards")
        .select("id")
        .eq("program_id", program.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existing) {
        return { joined: true, programId: program.id };
    }

    const { error } = await supabase.rpc("join_loyalty_program", {
        requested_program_id: program.id,
    });

    if (error) {
        return { joined: false, error };
    }

    return { joined: true, programId: program.id };
}
