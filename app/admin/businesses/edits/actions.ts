"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

// Read, and dealt with. The edit itself is already live — this is us
// saying we have looked at it.
export async function markEditsSeen(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const supabase = await createClient();

    const { error } = await supabase.rpc("mark_business_edits_seen", {
        requested_business_id: businessId,
    });

    if (error) {
        console.error("Admin: could not mark business edits seen", error);
    }

    revalidatePath("/admin/businesses/edits");
}
