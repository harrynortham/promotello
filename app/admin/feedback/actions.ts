"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

const statuses = ["new", "planned", "done", "declined"];

// Move a piece of feedback along. Row-level security checks the caller is
// a platform admin; this only guards the shape.
export async function setFeedbackStatus(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");

    if (!id || !statuses.includes(status)) {
        redirect("/admin/feedback");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("business_feedback").update({ status }).eq("id", id);

    if (error) {
        console.error("Admin feedback: could not update", error);
    }

    revalidatePath("/admin/feedback");
}
