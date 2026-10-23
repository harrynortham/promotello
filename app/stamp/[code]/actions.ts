"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

const knownErrors: Record<string, string> = {
    P0005: "cooldown",
    P0001: "not-ready",
    "42501": "forbidden",
    P0002: "not-found",
};

async function runCardAction(rpc: "add_loyalty_stamp" | "redeem_loyalty_reward", formData: FormData) {
    const code = String(formData.get("code") ?? "");
    const done = rpc === "add_loyalty_stamp" ? "stamp" : "reward";

    const supabase = await createClient();
    const { error } = await supabase.rpc(rpc, { requested_code: code });

    if (error) {
        const reason = knownErrors[error.code] ?? "failed";
        // Own-card attempts get their own message.
        redirect(`/stamp/${code}?error=${error.message.includes("own card") ? "own-card" : reason}`);
    }

    redirect(`/stamp/${code}?done=${done}`);
}

export async function addStamp(formData: FormData) {
    await runCardAction("add_loyalty_stamp", formData);
}

export async function redeemReward(formData: FormData) {
    await runCardAction("redeem_loyalty_reward", formData);
}
