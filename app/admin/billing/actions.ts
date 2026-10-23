"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function resolveBillingAlert(formData: FormData) {
    const alertId = String(formData.get("alertId") ?? "");
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // RLS only lets platform admins update billing alerts.
    const { error } = await supabase
        .from("billing_alerts")
        .update({
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
        })
        .eq("id", alertId);

    if (error) {
        throw new Error("Unable to resolve this alert. Please try again.");
    }

    revalidatePath("/admin/billing");
}
