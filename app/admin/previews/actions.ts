"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { instagramHandle } from "./preview-shared";

function text(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
}

// Builds a business with the admin as its temporary owner, plus its
// preview. The business stays pending (hidden from customers) until it's
// claimed and approved.
//
// Returns the id rather than redirecting: the form has the logo and the
// cover photo in hand and can only upload them once the business exists,
// so it finishes the job and sends the admin to the preview itself.
export async function createPreview(formData: FormData): Promise<{ businessId?: string; error?: string }> {
    const supabase = await createClient();

    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) redirect("/admin");

    const sampleOffer = text(formData, "sampleOffer");
    const sampleReward = text(formData, "sampleReward");
    const stamps = Number(formData.get("sampleStamps"));

    if (sampleOffer.length < 3 || sampleReward.length < 3) {
        return { error: "Add a sample offer and a loyalty reward." };
    }

    const { data: businessId, error } = await supabase.rpc("create_business_with_owner", {
        business_name: text(formData, "businessName"),
        business_category: text(formData, "category"),
        business_description: text(formData, "description") || null,
        business_website_url: text(formData, "website") || null,
        business_contact_email: text(formData, "contactEmail") || null,
        location_name: "Main location",
        location_address_line_1: text(formData, "addressLine1"),
        location_address_line_2: null,
        location_city: text(formData, "city"),
        location_region: text(formData, "region") || null,
        location_postal_code: text(formData, "postalCode") || null,
        location_country_code: "GB",
    });

    if (error || !businessId) {
        return { error: error?.message ?? "The business couldn't be created." };
    }

    const { data: user } = await supabase.auth.getUser();
    const { error: previewError } = await supabase.from("business_previews").insert({
        business_id: businessId,
        contact_name: text(formData, "contactName").slice(0, 80) || null,
        contact_email: text(formData, "contactEmail").slice(0, 160) || null,
        instagram_handle: instagramHandle(text(formData, "instagramHandle")),
        sample_offer: sampleOffer.slice(0, 80),
        sample_reward: sampleReward.slice(0, 60),
        sample_stamps: Number.isInteger(stamps) && stamps >= 3 && stamps <= 20 ? stamps : 9,
        created_by: user.user?.id ?? null,
    });

    if (previewError) {
        return {
            error: `The preview couldn't be saved (${previewError.message}). The business was created; find it under Businesses.`,
        };
    }

    revalidatePath("/admin/previews");
    return { businessId };
}

// Deletes an unclaimed preview and the business built for it.
export async function deletePreview(formData: FormData) {
    const supabase = await createClient();
    const businessId = text(formData, "businessId");

    // Only deletes it if it hasn't been claimed.
    await supabase.rpc("delete_business_preview", { requested_business_id: businessId });

    revalidatePath("/admin/previews");
    redirect("/admin/previews");
}

const statuses = ["to_send", "sent", "replied", "not_interested"];

// Where a preview has got to. Marking it sent stamps the time, which is what
// stops a business being written to twice; moving it back clears that.
export async function setPreviewStatus(formData: FormData) {
    const businessId = text(formData, "businessId");
    const status = text(formData, "status");

    if (!businessId || !statuses.includes(status)) {
        redirect("/admin/previews");
    }

    const supabase = await createClient();

    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) redirect("/admin");

    if (status === "to_send") {
        // Putting it back on the list forgets that it was ever sent.
        const { error } = await supabase
            .from("business_previews")
            .update({ status, contacted_at: null })
            .eq("business_id", businessId);

        if (error) console.error("Preview status: could not update", error);
    } else {
        const { error } = await supabase
            .from("business_previews")
            .update({ status })
            .eq("business_id", businessId);

        if (error) console.error("Preview status: could not update", error);

        // Stamped once, on the first move off the list, so a later reply
        // doesn't rewrite when it actually went out.
        const { error: stampError } = await supabase
            .from("business_previews")
            .update({ contacted_at: new Date().toISOString() })
            .eq("business_id", businessId)
            .is("contacted_at", null);

        if (stampError) console.error("Preview status: could not stamp", stampError);
    }

    revalidatePath("/admin/previews");
    revalidatePath(`/admin/previews/${businessId}`);
}

// A line to yourself about this one: "said come back in January".
export async function savePreviewNotes(formData: FormData) {
    const businessId = text(formData, "businessId");
    const notes = text(formData, "notes").slice(0, 1000);

    const supabase = await createClient();

    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) redirect("/admin");

    const { error } = await supabase
        .from("business_previews")
        .update({ notes: notes || null })
        .eq("business_id", businessId);

    if (error) {
        console.error("Preview notes: could not save", error);
    }

    revalidatePath("/admin/previews");
    revalidatePath(`/admin/previews/${businessId}`);
}

// The account to DM. Taken as a handle, an @handle or a pasted profile link,
// and stored bare so it can be dropped into a message link.
export async function savePreviewInstagram(formData: FormData) {
    const businessId = text(formData, "businessId");
    const handle = instagramHandle(text(formData, "instagramHandle"));

    const supabase = await createClient();

    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) redirect("/admin");

    const { error } = await supabase
        .from("business_previews")
        .update({ instagram_handle: handle })
        .eq("business_id", businessId);

    if (error) {
        console.error("Preview Instagram: could not save", error);
    }

    revalidatePath("/admin/previews");
    revalidatePath(`/admin/previews/${businessId}`);
}
