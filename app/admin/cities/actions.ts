"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

function districts(raw: string) {
    return [...new Set(raw.toUpperCase().split(/[\s,]+/).filter((code) => /^[A-Z]{1,2}[0-9][A-Z0-9]?$/.test(code)))];
}

// RLS: only platform admins can change cities and areas.

export async function addCity(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const postcodes = districts(String(formData.get("postcodeDistricts") ?? ""));

    if (name.length < 2 || postcodes.length === 0) {
        redirect("/admin/cities?error=city");
    }

    const { error } = await (await createClient()).from("cities").insert({
        name,
        slug: slugify(name),
        postcode_districts: postcodes,
        is_live: false,
    });

    redirect(error ? "/admin/cities?error=city" : "/admin/cities?saved=city");
}

function coordinate(raw: FormDataEntryValue | null, limit: number) {
    const text = String(raw ?? "").trim();
    const value = Number(text);
    return text && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

// A photo is a path on this site (/images/...) or a file in Supabase
// Storage, the only image hosts next/image allows.
function photo(raw: FormDataEntryValue | null) {
    const text = String(raw ?? "").trim();
    const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/`;
    return /^\/[\w./-]+$/.test(text) || (text.startsWith(storage) && !/\s/.test(text)) ? text : null;
}

export async function updateCity(formData: FormData) {
    const id = String(formData.get("cityId") ?? "");
    const postcodes = districts(String(formData.get("postcodeDistricts") ?? ""));
    const radius = Math.round(Number(formData.get("radiusKm")));

    const { error } = await (await createClient())
        .from("cities")
        .update({
            postcode_districts: postcodes,
            is_live: formData.get("isLive") === "on",
            // Visitors within this distance of the centre see this city.
            latitude: coordinate(formData.get("latitude"), 90),
            longitude: coordinate(formData.get("longitude"), 180),
            radius_km: Number.isFinite(radius) ? Math.min(Math.max(radius, 1), 200) : 20,
            hero_image_url: photo(formData.get("heroImageUrl")),
            feature_image_url: photo(formData.get("featureImageUrl")),
        })
        .eq("id", id);

    updateTag("cities");
    revalidatePath("/", "layout");
    redirect(error ? "/admin/cities?error=update" : "/admin/cities?saved=update");
}

export async function addArea(formData: FormData) {
    const cityId = String(formData.get("cityId") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    if (name.length < 2) {
        redirect("/admin/cities?error=area");
    }

    const { error } = await (await createClient()).from("areas").insert({ city_id: cityId, name, slug: slugify(name) });
    updateTag("cities");

    redirect(error ? "/admin/cities?error=area" : "/admin/cities?saved=area");
}

export async function setAreaActive(formData: FormData) {
    const id = String(formData.get("areaId") ?? "");

    await (await createClient()).from("areas").update({ is_active: formData.get("active") === "true" }).eq("id", id);
    updateTag("cities");

    redirect("/admin/cities");
}
