"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

// Builds the demo business, or puts it back the way it demos best after
// a sales call has stamped its cards
// (20270102090000_a_business_only_we_can_see.sql). Admin-gated in the
// function itself; whoever presses it becomes its owner.
export async function buildDemoBusiness() {
    const supabase = await createClient();

    const { error } = await supabase.rpc("refresh_demo_business");

    if (error) {
        console.error("Admin: could not build the demo business", error);
    }

    revalidatePath("/admin/demo");
}
