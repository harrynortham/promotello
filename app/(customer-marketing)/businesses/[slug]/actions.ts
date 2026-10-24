"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function joinLoyaltyProgram(formData: FormData) {
    const programId = String(formData.get("programId") ?? "");
    const businessId = String(formData.get("businessId") ?? "");
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/businesses/${businessId}`)}`);
    }

    const { error } = await supabase.rpc("join_loyalty_program", {
        requested_program_id: programId,
    });

    if (error) {
        redirect(`/businesses/${businessId}?loyalty=unavailable#loyalty`);
    }

    redirect(`/dashboard/loyalty?joined=${programId}`);
}
