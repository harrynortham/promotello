"use server";

import { redirect } from "next/navigation";

import { createPublicClient } from "@/utils/supabase/public";

export async function joinWaitlist(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const town = String(formData.get("town") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();

    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || town.length < 2) {
        redirect("/business/waitlist?error=invalid");
    }

    const { error } = await createPublicClient().from("business_waitlist").insert({
        name: name.slice(0, 120),
        email,
        town: town.slice(0, 100),
        business_name: businessName.slice(0, 160) || null,
    });

    redirect(error ? "/business/waitlist?error=save" : "/business/waitlist?joined=1");
}
