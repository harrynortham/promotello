"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

// Kept as plain lists so this server file does not pull in the palette's
// React-facing helpers.
const CARD_COLOUR_NAMES = ["navy", "coral", "forest", "plum", "ocean", "charcoal"];
const STAMP_ICON_NAMES = ["check", "star", "heart", "coffee", "gift"];

function readProgramFields(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const stampsRequired = Number(formData.get("stampsRequired"));
    const reward = String(formData.get("reward") ?? "").trim();
    const terms = String(formData.get("terms") ?? "").trim();
    const cardColour = String(formData.get("cardColour") ?? "navy");
    const stampIcon = String(formData.get("stampIcon") ?? "check");

    const valid =
        name.length >= 2 &&
        name.length <= 60 &&
        Number.isInteger(stampsRequired) &&
        stampsRequired >= 3 &&
        stampsRequired <= 20 &&
        reward.length >= 2 &&
        reward.length <= 80 &&
        terms.length <= 500 &&
        CARD_COLOUR_NAMES.includes(cardColour) &&
        STAMP_ICON_NAMES.includes(stampIcon);

    return valid
        ? {
            name,
            stamps_required: stampsRequired,
            reward,
            terms: terms || null,
            card_colour: cardColour,
            stamp_icon: stampIcon,
        }
        : null;
}

export async function saveLoyaltyProgram(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const programId = String(formData.get("programId") ?? "");
    // Replacing closes the card being offered and opens a new one in its
    // place, so a business is never without one and never has two.
    const replacing = formData.get("replacing") === "true";
    const page = `/business/${businessId}/loyalty`;
    const fields = readProgramFields(formData);

    if (!fields) {
        redirect(`${page}?error=invalid`);
    }

    const supabase = await createClient();

    // RLS limits this to business admins; a trigger requires Pro to switch a
    // programme on, and another freezes the terms of a card people hold.
    const { error } = programId
        ? await supabase.from("loyalty_programs").update(fields).eq("id", programId).eq("business_id", businessId)
        : replacing
            ? await supabase.rpc("replace_loyalty_card", {
                requested_business_id: businessId,
                new_name: fields.name,
                new_stamps_required: fields.stamps_required,
                new_reward: fields.reward,
                new_terms: fields.terms,
                new_card_colour: fields.card_colour,
                new_stamp_icon: fields.stamp_icon,
            })
            : await supabase.from("loyalty_programs").insert({ ...fields, business_id: businessId });

    if (error) {
        const reason =
            error.code === "P0004"
                ? "pro"
                // 23505: two cards on offer can't share a name.
                : error.code === "23505"
                    ? "name"
                    : error.code === "P0006"
                        ? "frozen"
                        : "save";
        redirect(`${page}?error=${reason}`);
    }

    revalidatePath(page);
    redirect(`${page}?saved=1`);
}

// Taking a card off the page without taking it away from the people
// holding it: they carry on stamping, nobody new joins.
export async function closeLoyaltyProgram(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const programId = String(formData.get("programId") ?? "");
    const page = `/business/${businessId}/loyalty`;

    const supabase = await createClient();
    const { error } = await supabase
        .from("loyalty_programs")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", programId)
        .eq("business_id", businessId);

    if (error) {
        redirect(`${page}?error=save`);
    }

    revalidatePath(page);
    redirect(`${page}?closed=1`);
}

// Handing a closed card out again. Only one card per business takes new
// joiners — a unique index says so — and the check is here as well, so
// the answer is a sentence rather than a constraint violation.
export async function reopenLoyaltyProgram(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const programId = String(formData.get("programId") ?? "");
    const page = `/business/${businessId}/loyalty`;

    const supabase = await createClient();

    const { data: onOffer } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null)
        .limit(1)
        .maybeSingle();

    if (onOffer && onOffer.id !== programId) {
        redirect(`${page}?error=another`);
    }

    const { error } = await supabase
        .from("loyalty_programs")
        .update({ closed_at: null })
        .eq("id", programId)
        .eq("business_id", businessId);

    if (error) {
        redirect(`${page}?error=${error.code === "23505" ? "another" : "save"}`);
    }

    revalidatePath(page);
    redirect(`${page}?reopened=1`);
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

// Saves just the look of the card. Returns the problem instead of
// redirecting, so the design dialog can stay open and say what went wrong.
export async function saveLoyaltyDesign(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const programId = String(formData.get("programId") ?? "");
    const cardColour = String(formData.get("cardColour") ?? "");
    const stampIcon = String(formData.get("stampIcon") ?? "");

    if (!CARD_COLOUR_NAMES.includes(cardColour) || !STAMP_ICON_NAMES.includes(stampIcon)) {
        return { error: "That card design isn't available. Please choose another." };
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from("loyalty_programs")
        .update({ card_colour: cardColour, stamp_icon: stampIcon })
        .eq("id", programId)
        .eq("business_id", businessId);

    if (error) {
        return { error: "We couldn't save the card design. Please try again." };
    }

    revalidatePath(`/business/${businessId}/loyalty`);

    return { error: null };
}
