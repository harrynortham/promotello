"use server";

import { redirect } from "next/navigation";

import { ukLocalToIso } from "@/lib/uk-time";
import { createClient } from "@/utils/supabase/server";

export async function createEvent(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const path = `/business/${businessId}/events`;
    const title = String(formData.get("title") ?? "").trim();
    const date = String(formData.get("date") ?? "");
    const startTime = String(formData.get("startTime") ?? "");
    const endTime = String(formData.get("endTime") ?? "");

    if (title.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
        redirect(`${path}?error=invalid`);
    }

    const startsAt = ukLocalToIso(date, startTime);
    const endsAt = /^\d{2}:\d{2}$/.test(endTime) ? ukLocalToIso(date, endTime) : null;

    if (endsAt && endsAt <= startsAt) {
        redirect(`${path}?error=times`);
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // RLS: admins only, and adding events needs Growth.
    const { error } = await supabase.from("business_events").insert({
        business_id: businessId,
        title,
        description: String(formData.get("description") ?? "").trim(),
        starts_at: startsAt,
        ends_at: endsAt,
        location: String(formData.get("location") ?? "").trim() || null,
        price: String(formData.get("price") ?? "").trim() || null,
        created_by: user?.id ?? null,
    });

    redirect(error ? `${path}?error=save` : `${path}?saved=1`);
}

export async function deleteEvent(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const eventId = String(formData.get("eventId") ?? "");

    await (await createClient()).from("business_events").delete().eq("id", eventId).eq("business_id", businessId);

    redirect(`/business/${businessId}/events`);
}
