"use server";

import { redirect } from "next/navigation";

import { tellThemAboutTheNewCard } from "@/lib/loyalty-handover";
import { createClient } from "@/utils/supabase/server";

const knownErrors: Record<string, string> = {
    P0005: "cooldown",
    P0001: "not-ready",
    P0007: "finished",
    P0008: "full",
    "42501": "forbidden",
    P0002: "not-found",
};

// What the stamp or the redemption did, as well as what the card now
// says. A closed card can fill, finish, and hand over the new one in the
// same press (20261226090000_a_closed_card_gets_one_last_lap.sql).
type CardAction = {
    card_full: boolean;
    card_finished: boolean;
    issued_card_id: string | null;
    issued_is_new: boolean;
};

async function runCardAction(rpc: "add_loyalty_stamp" | "redeem_loyalty_reward", formData: FormData) {
    const code = String(formData.get("code") ?? "");
    const done = rpc === "add_loyalty_stamp" ? "stamp" : "reward";

    const supabase = await createClient();
    const { data, error } = await supabase.rpc(rpc, { requested_code: code });

    if (error) {
        const reason = knownErrors[error.code] ?? "failed";
        // Own-card attempts get their own message.
        redirect(`/stamp/${code}?error=${error.message.includes("own card") ? "own-card" : reason}`);
    }

    const result = (Array.isArray(data) ? data[0] : data) as CardAction | null;

    // The card is theirs either way; this is only the telling.
    if (result?.issued_is_new) {
        await tellThemAboutTheNewCard(result.issued_card_id);
    }

    // The code scanned is still the code to come back to: the page
    // decides what can be done with it now.
    const handed = result?.issued_card_id ? "&handed=1" : "";
    const finished = result?.card_finished ? "&finished=1" : "";

    redirect(`/stamp/${code}?done=${done}${handed}${finished}`);
}

export async function addStamp(formData: FormData) {
    await runCardAction("add_loyalty_stamp", formData);
}

export async function redeemReward(formData: FormData) {
    await runCardAction("redeem_loyalty_reward", formData);
}
