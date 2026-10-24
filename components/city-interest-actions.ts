"use server";

import { createPublicClient } from "@/utils/supabase/public";

export type CityInterestState = { status: "idle" | "saved" | "invalid" | "error" };

// A customer outside every live city asks to hear when we launch near them.
export async function registerCityInterest(_previous: CityInterestState, formData: FormData): Promise<CityInterestState> {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const town = String(formData.get("town") ?? "").trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 320 || town.length < 2) {
        return { status: "invalid" };
    }

    const { error } = await createPublicClient()
        .from("city_interest")
        .insert({ email, town: town.slice(0, 100) });

    return { status: error ? "error" : "saved" };
}
