"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkCompaniesHouse, findEmail } from "@/lib/lead-jobs";
import { createClient } from "@/utils/supabase/server";

function text(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
}

async function adminClient() {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) redirect("/admin");

    return supabase;
}

// Every move a lead makes is written down as well as set, so the stage can
// be dragged about without losing the day we wrote to them.
async function record(
    supabase: Awaited<ReturnType<typeof createClient>>,
    leadId: string,
    kind: string,
    detail?: string,
) {
    await supabase.from("lead_events").insert({ lead_id: leadId, kind, detail: detail ?? null });
}

export async function addLeads(formData: FormData) {
    const supabase = await adminClient();

    const chosen = formData.getAll("place").map((value) => String(value));
    const cityId = text(formData, "cityId") || null;
    const areaId = text(formData, "areaId") || null;

    if (chosen.length === 0) {
        redirect("/admin/sales/import?error=nothing_chosen");
    }

    // What Google returned travels through the form rather than being
    // fetched again: the operator has already read it and chosen, and
    // this is the moment it stops being Google's and starts being ours.
    const rows = chosen.map((value) => {
        const place = JSON.parse(value) as {
            place_id: string;
            name: string;
            address: string | null;
            website: string | null;
            phone: string | null;
        };

        return {
            place_id: place.place_id,
            name: place.name,
            address: place.address,
            website: place.website,
            phone: place.phone,
            city_id: cityId,
            area_id: areaId,
            stage: "new",
        };
    });

    const { data, error } = await supabase
        .from("leads")
        .upsert(rows, { onConflict: "place_id", ignoreDuplicates: true })
        .select("id");

    if (error) {
        redirect(`/admin/sales/import?error=${encodeURIComponent(error.message)}`);
    }

    for (const lead of data ?? []) {
        await record(supabase, lead.id, "imported");
    }

    revalidatePath("/admin/sales");
    redirect(`/admin/sales?added=${(data ?? []).length}`);
}

// Reads their own site for the address they publish. Writes down where it
// came from, because "this was on your contact page" is the answer to
// "how did you get this".
export async function enrichLead(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    const { data: lead } = await supabase
        .from("leads")
        .select("id, website, stage")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) redirect("/admin/sales");

    const result = await findEmail(lead.website);

    if (!result.found) {
        await record(supabase, leadId, "note", `No address found: ${result.reason.replace(/_/g, " ")}`);
        revalidatePath(`/admin/sales/${leadId}`);
        return;
    }

    await supabase
        .from("leads")
        .update({
            email: result.email,
            email_source: result.source,
            email_found_at: new Date().toISOString(),
            stage: lead.stage === "new" ? "enriched" : lead.stage,
        })
        .eq("id", leadId);

    await record(supabase, leadId, "email_found", `${result.email} — ${result.source}`);
    revalidatePath(`/admin/sales/${leadId}`);
}

// The legal gate. Only a confident match turns can_email on, and the
// database refuses it without a company number either way
// (20270131090000).
export async function checkCompany(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    const { data: lead } = await supabase
        .from("leads")
        .select("id, name, postcode, stage")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) redirect("/admin/sales");

    const match = await checkCompaniesHouse(lead.name, lead.postcode);
    const checkedAt = new Date().toISOString();

    if (!match.confident) {
        await supabase
            .from("leads")
            .update({ companies_house_checked_at: checkedAt, can_email: false })
            .eq("id", leadId);

        await record(
            supabase,
            leadId,
            "companies_house_checked",
            `Not emailable: ${match.reason.replace(/_/g, " ")}. Post only.`,
        );

        revalidatePath(`/admin/sales/${leadId}`);
        return;
    }

    await supabase
        .from("leads")
        .update({
            company_number: match.company.company_number,
            company_name: match.company.title,
            can_email: true,
            companies_house_checked_at: checkedAt,
            stage: ["new", "enriched"].includes(lead.stage) ? "emailable" : lead.stage,
        })
        .eq("id", leadId);

    await record(
        supabase,
        leadId,
        "companies_house_checked",
        `${match.company.title} (${match.company.company_number}) — emailable`,
    );

    revalidatePath(`/admin/sales/${leadId}`);
}

export async function moveLead(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");
    const stage = text(formData, "stage");

    const { data: lead } = await supabase
        .from("leads")
        .select("id, can_email")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) redirect("/admin/sales");

    // The gate again, at the one place somebody could walk a lead into a
    // sending stage by hand.
    if (["emailed", "followed_up"].includes(stage) && !lead.can_email) {
        await record(
            supabase,
            leadId,
            "note",
            "Refused: this lead is post only until Companies House says otherwise.",
        );
        revalidatePath(`/admin/sales/${leadId}`);
        return;
    }

    await supabase.from("leads").update({ stage }).eq("id", leadId);

    const kinds: Record<string, string> = {
        emailed: "emailed",
        followed_up: "followed_up",
        letter: "letter_sent",
        claimed: "claimed",
        not_interested: "closed",
        dead: "closed",
    };

    await record(supabase, leadId, kinds[stage] ?? "note", kinds[stage] ? undefined : `Moved to ${stage}`);

    revalidatePath("/admin/sales");
    revalidatePath(`/admin/sales/${leadId}`);
}

export async function saveLeadNotes(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    await supabase.from("leads").update({ notes: text(formData, "notes") }).eq("id", leadId);

    revalidatePath(`/admin/sales/${leadId}`);
}
