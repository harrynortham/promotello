"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

async function requireUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/business/dashboard");
    }

    return { supabase, user };
}

export async function createQrCode(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const label = String(formData.get("label") ?? "").trim();
    const target = String(formData.get("target") ?? "business");
    const page = `/business/${businessId}/qr`;

    if (label.length < 2 || label.length > 60) {
        redirect(`${page}?error=label`);
    }

    const { supabase, user } = await requireUser();

    // RLS checks the user is an admin and the offer belongs to the business;
    // a trigger enforces the Free plan's single code.
    const { error } = await supabase.from("qr_codes").insert({
        business_id: businessId,
        label,
        offer_id: target === "business" ? null : target,
        created_by: user.id,
    });

    if (error) {
        redirect(`${page}?error=${error.code === "P0004" ? "limit" : "create"}`);
    }

    revalidatePath(page);
    redirect(`${page}?created=1`);
}

export async function archiveQrCode(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const codeId = String(formData.get("codeId") ?? "");
    const { supabase } = await requireUser();

    const { error } = await supabase
        .from("qr_codes")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", codeId)
        .eq("business_id", businessId);

    if (error) {
        redirect(`/business/${businessId}/qr?error=archive`);
    }

    revalidatePath(`/business/${businessId}/qr`);
}
