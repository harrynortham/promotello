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

// Kept here so this server file does not pull in the palette's React side.
const POSTER_COLOURS = ["navy", "coral", "forest", "plum", "ocean", "charcoal"];

export async function createQrCode(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const label = String(formData.get("label") ?? "").trim();
    const target = String(formData.get("target") ?? "business");
    const posterColour = String(formData.get("posterColour") ?? "navy");
    const posterEyebrow = String(formData.get("posterEyebrow") ?? "").trim();
    const posterHeadline = String(formData.get("posterHeadline") ?? "").trim();
    const posterDescription = String(formData.get("posterDescription") ?? "").trim();
    const loyaltyProgramId = String(formData.get("loyaltyProgramId") ?? "");
    const page = `/business/${businessId}/qr`;

    if (label.length < 2 || label.length > 60) {
        redirect(`${page}?error=label`);
    }

    if (
        !POSTER_COLOURS.includes(posterColour) ||
        posterEyebrow.length > 40 ||
        posterHeadline.length > 90 ||
        posterDescription.length > 140
    ) {
        redirect(`${page}?error=create`);
    }

    const { supabase, user } = await requireUser();

    // RLS checks the user is an admin and the offer belongs to the business;
    // triggers enforce the Free plan's single code (P0004) and that the
    // business is approved (P0003).
    // A code opens one thing: the business page, an offer, or the card.
    const { error } = await supabase.from("qr_codes").insert({
        business_id: businessId,
        label,
        offer_id: target === "business" || target === "loyalty" ? null : target,
        loyalty_program_id: target === "loyalty" ? (loyaltyProgramId || null) : null,
        poster_colour: posterColour,
        // Empty means the poster works the words out from the offer.
        poster_eyebrow: posterEyebrow || null,
        poster_headline: posterHeadline || null,
        // Only an offer poster has this line, and only the words the
        // business kept or wrote are stored.
        poster_description: target === "business" ? null : posterDescription || null,
        created_by: user.id,
    });

    if (error) {
        const reason = { P0004: "limit", P0003: "approval" }[error.code] ?? "create";
        redirect(`${page}?error=${reason}`);
    }

    revalidatePath(page);
    redirect(`${page}?created=1`);
}

export async function deleteQrCode(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const codeId = String(formData.get("codeId") ?? "");
    const { supabase } = await requireUser();

    const { error } = await supabase
        .from("qr_codes")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", codeId)
        .eq("business_id", businessId);

    if (error) {
        redirect(`/business/${businessId}/qr?error=delete`);
    }

    revalidatePath(`/business/${businessId}/qr`);
}
