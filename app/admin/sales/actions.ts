"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    outreachMessage,
    outreachSubject,
    previewColumns,
    senderName,
    type PreviewRow,
} from "@/app/admin/previews/preview-shared";
import { sendEmails } from "@/lib/email";
import { foundingPlacesLeft } from "@/lib/founding-places";
import { checkCompaniesHouse, findContactDetails } from "@/lib/lead-jobs";
import { asHtml, followUpMessage, followUpSubject, outreachSender, withDisclosure } from "@/lib/outreach-queue";
import { previewLink } from "@/lib/previews";
import { absoluteUrl } from "@/lib/site";
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
            // Provisional: Google's, kept so the operator has something
            // to look at, and replaced the moment enrichment finds the
            // one the business publishes itself (20270202090000).
            address: place.address,
            address_source: place.address ? "places" : null,
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
        .select("id, website, stage, address_source")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) redirect("/admin/sales");

    const found = await findContactDetails(lead.website);

    if (!found.email && !found.address) {
        await record(
            supabase,
            leadId,
            "note",
            `Nothing found on their site: ${(found.reason ?? "nothing published").replace(/_/g, " ")}`,
        );
        revalidatePath(`/admin/sales/${leadId}`);
        return;
    }

    const now = new Date().toISOString();

    const update: Record<string, unknown> = {
        stage: lead.stage === "new" ? "enriched" : lead.stage,
    };

    if (found.email) {
        update.email = found.email;
        update.email_source = found.source;
        update.email_found_at = now;
    }

    // Their own published address replaces the provisional one from the
    // import, which is Google's and not ours to keep (20270202090000). A
    // typed one is left alone: somebody looked at it on purpose.
    if (found.address && lead.address_source !== "typed") {
        update.address = found.address;
        update.address_source = "website";
        update.address_found_at = now;
        if (found.postcode) update.postcode = found.postcode;
    }

    await supabase.from("leads").update(update).eq("id", leadId);

    if (found.email) {
        await record(supabase, leadId, "email_found", `${found.email} — ${found.source}`);
    }

    if (found.address && lead.address_source !== "typed") {
        await record(supabase, leadId, "note", `Address from their own site: ${found.address}`);
    }

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

// --- The outreach queue -------------------------------------------
//
// Drafting reuses what the previews page composes, so a lead gets the
// email that has been argued over for months rather than a second
// version of it. Nothing is sent here: a draft waits until somebody has
// read it and pressed send.

export async function queueOutreach(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");
    const kind = text(formData, "kind") === "follow_up" ? "follow_up" : "first";

    const { data: lead } = await supabase
        .from("leads")
        .select("id, name, email, can_email, preview_business_id")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) redirect("/admin/sales");

    // Said here as well as in the database, so the reason reaches the
    // person rather than only the log.
    if (!lead.can_email) {
        await record(supabase, leadId, "note", "Not queued: post only until Companies House says otherwise.");
        revalidatePath(`/admin/sales/${leadId}`);
        return;
    }

    if (!lead.email || !lead.preview_business_id) {
        await record(
            supabase,
            leadId,
            "note",
            !lead.email ? "Not queued: no address to write to." : "Not queued: no preview to send them.",
        );
        revalidatePath(`/admin/sales/${leadId}`);
        return;
    }

    const { data: preview } = await supabase
        .from("business_previews")
        .select(previewColumns)
        .eq("business_id", lead.preview_business_id)
        .maybeSingle();

    if (!preview) {
        await record(supabase, leadId, "note", "Not queued: the preview has gone.");
        revalidatePath(`/admin/sales/${leadId}`);
        return;
    }

    const { data: profile } = await supabase.auth.getUser();
    const sender = senderName(profile.user?.user_metadata?.full_name);
    const row = preview as unknown as PreviewRow;
    const link = absoluteUrl(previewLink(row.token, row.businesses?.name));

    const draft =
        kind === "first"
            ? {
                subject: outreachSubject(row),
                body: outreachMessage(row, sender, await foundingPlacesLeft()),
            }
            : {
                subject: followUpSubject(lead.name),
                body: followUpMessage(lead.name, link, sender),
            };

    const { error } = await supabase.from("outreach_messages").insert({
        lead_id: leadId,
        kind,
        to_email: lead.email,
        subject: draft.subject,
        // The disclosure goes on here, not inside the composer: the
        // previews page still copies that message into Gmail, where the
        // signature adds it, and twice reads badly.
        body: withDisclosure(draft.body),
    });

    if (error) {
        // The unique index, almost always: it is already waiting.
        await record(supabase, leadId, "note", `Not queued: ${error.message}`);
    }

    revalidatePath("/admin/sales/outbox");
    revalidatePath(`/admin/sales/${leadId}`);
}

export async function cancelOutreach(formData: FormData) {
    const supabase = await adminClient();

    await supabase
        .from("outreach_messages")
        .update({ status: "cancelled" })
        .eq("id", text(formData, "messageId"))
        .eq("status", "queued");

    revalidatePath("/admin/sales/outbox");
}

// The one that actually writes to somebody. Everything up to here is
// reversible; this is not.
export async function sendOutreach(formData: FormData) {
    const supabase = await adminClient();
    const messageId = text(formData, "messageId");

    const from = outreachSender();

    if (!from) {
        redirect("/admin/sales/outbox?error=no_sender");
    }

    const { data: message } = await supabase
        .from("outreach_messages")
        .select("id, lead_id, kind, to_email, subject, body, status")
        .eq("id", messageId)
        .maybeSingle();

    if (!message || message.status !== "queued") {
        redirect("/admin/sales/outbox");
    }

    const { data: profile } = await supabase.auth.getUser();

    const result = await sendEmails(
        [{
            to: message.to_email,
            subject: message.subject,
            text: message.body,
            html: asHtml(message.body),
        }],
        { from },
    );

    if (result.sent === 0) {
        await supabase
            .from("outreach_messages")
            .update({ status: "failed", failed_reason: "Resend did not accept it" })
            .eq("id", messageId);

        await record(supabase, message.lead_id, "note", "The email was not accepted. Nothing was sent.");
        revalidatePath("/admin/sales/outbox");
        return;
    }

    await supabase
        .from("outreach_messages")
        .update({ status: "sent", sent_at: new Date().toISOString(), approved_by: profile.user?.id ?? null })
        .eq("id", messageId);

    await supabase
        .from("leads")
        .update({ stage: message.kind === "first" ? "emailed" : "followed_up" })
        .eq("id", message.lead_id);

    await record(
        supabase,
        message.lead_id,
        message.kind === "first" ? "emailed" : "followed_up",
        `Sent to ${message.to_email}`,
    );

    revalidatePath("/admin/sales/outbox");
    revalidatePath(`/admin/sales/${message.lead_id}`);
}
