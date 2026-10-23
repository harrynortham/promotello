"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

function readProgramFields(formData: FormData) {
    const stampsRequired = Number(formData.get("stampsRequired"));
    const reward = String(formData.get("reward") ?? "").trim();
    const terms = String(formData.get("terms") ?? "").trim();

    const valid =
        Number.isInteger(stampsRequired) &&
        stampsRequired >= 3 &&
        stampsRequired <= 20 &&
        reward.length >= 2 &&
        reward.length <= 80 &&
        terms.length <= 500;

    return valid ? { stamps_required: stampsRequired, reward, terms: terms || null } : null;
}

export async function saveLoyaltyProgram(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const programId = String(formData.get("programId") ?? "");
    const page = `/business/${businessId}/loyalty`;
    const fields = readProgramFields(formData);

    if (!fields) {
        redirect(`${page}?error=invalid`);
    }

    const supabase = await createClient();

    // RLS limits this to business admins; a trigger requires Pro to switch a
    // programme on.
    const { error } = programId
        ? await supabase.from("loyalty_programs").update(fields).eq("id", programId).eq("business_id", businessId)
        : await supabase.from("loyalty_programs").insert({ ...fields, business_id: businessId });

    if (error) {
        redirect(`${page}?error=${error.code === "P0004" ? "pro" : "save"}`);
    }

    revalidatePath(page);
    redirect(`${page}?saved=1`);
}

export async function setLoyaltyProgramActive(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const programId = String(formData.get("programId") ?? "");
    const active = formData.get("active") === "true";
    const page = `/business/${businessId}/loyalty`;

    const supabase = await createClient();
    const { error } = await supabase
        .from("loyalty_programs")
        .update({ is_active: active })
        .eq("id", programId)
        .eq("business_id", businessId);

    if (error) {
        redirect(`${page}?error=${error.code === "P0004" ? "pro" : "save"}`);
    }

    revalidatePath(page);
    redirect(page);
}

// Staff type in the code shown under the customer's card QR.
export async function lookUpLoyaltyCard(formData: FormData) {
    const code = String(formData.get("code") ?? "").replace(/\s+/g, "").toUpperCase();

    if (!/^[A-Z0-9]{6,16}$/.test(code)) {
        redirect(`/business/${String(formData.get("businessId") ?? "")}/loyalty?error=code`);
    }

    redirect(`/stamp/${code}`);
}
