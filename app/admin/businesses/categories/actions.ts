"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

// Putting a business in a category, once we have one for it. Their own
// words stood in until now, on their page and in this queue.
export async function putInCategory(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const categoryId = String(formData.get("categoryId") ?? "");

    if (!businessId || !categoryId) {
        return;
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("set_business_category", {
        requested_business_id: businessId,
        requested_category_id: categoryId,
    });

    if (error) {
        console.error("Admin: could not put a business in a category", error);
    }

    revalidatePath("/admin/businesses/categories");
}
