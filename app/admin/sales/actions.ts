"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
    followUpSubject,
    outreachFollowUp,
    outreachLetter,
    outreachMessage,
    outreachSubject,
    previewColumns,
    type PreviewRow,
} from "@/lib/preview-email";
import { sendEmails } from "@/lib/email";
import { foundingPlacesLeft } from "@/lib/founding-places";
import { compare, postcodeFrom, splitAddress } from "@/lib/lead-enrichment";
import { normalisePostcode } from "@/lib/locations";
import { STAGE_LABELS } from "@/lib/sales-pipeline";
import { checkCompaniesHouse, findContactDetails } from "@/lib/lead-jobs";
import { letterAddress, letterDestination, letterTemplate, sendLetter } from "@/lib/letters";
import { asHtml, outreachSender, withSignature } from "@/lib/outreach-queue";
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
    const { error } = await supabase
        .from("lead_events")
        .insert({ lead_id: leadId, kind, detail: detail ?? null });

    // An audit trail that fails quietly is worse than none: adding a
    // lead wrote the lead and no event, because 'added' was not yet an
    // allowed kind and nothing said so. The row is already written by
    // the time we get here, so this does not throw — it says so where
    // somebody will see it.
    if (error) {
        console.error(`lead_events insert failed (${kind}):`, error.message);
    }
}

// A lead, written down by hand.
//
// There was an importer here that asked Google what was trading on a
// street. The useful half of it — the address — was the half the terms
// would not let us keep (20270204090000), so what it actually saved was
// a name and a website, and every address was typed afterwards anyway.
// Typing the name too is barely more work and leaves nothing to explain.
//
// The crawler and the Companies House check still do the parts that are
// genuinely slow by hand.
// LocationFields submits the city and the area by name, the same as on
// every other form that uses it; a lead stores their ids. Resolved here
// rather than by growing a second shape of that component — and in one
// place, because adding a lead and correcting one have to agree about
// what a town is.
async function resolveLocation(
    supabase: Awaited<ReturnType<typeof adminClient>>,
    formData: FormData,
) {
    const cityName = text(formData, "city");
    const areaName = text(formData, "region");

    const { data: city } = cityName
        ? await supabase.from("cities").select("id").eq("name", cityName).maybeSingle()
        : { data: null };

    const { data: area } = areaName && city
        ? await supabase
              .from("areas")
              .select("id")
              .eq("name", areaName)
              .eq("city_id", city.id)
              .maybeSingle()
        : { data: null };

    return { cityId: city?.id ?? null, areaId: area?.id ?? null };
}

// Anything already written down that might be the same shop.
//
// The unique index catches a name typed the same way twice. It does not
// catch "Joe's Bakery" against "Joes Bakery", or a second branch at a
// different postcode, or a business already on Promotello — and the
// first two are what a street looks like when it is worked through over
// a week. So this asks the looser question and says what it found,
// rather than refusing: two shops can share a name, and only the person
// looking can tell.
export type PossibleMatch = {
    kind: "lead" | "business";
    id: string;
    name: string;
    where: string | null;
    note: string;
};

async function possibleMatches(
    supabase: Awaited<ReturnType<typeof adminClient>>,
    name: string,
    postcode: string | null,
    ignoreLeadId?: string,
): Promise<PossibleMatch[]> {
    const key = compare(name);

    if (!key) return [];

    const [{ data: leads }, { data: businesses }] = await Promise.all([
        supabase
            .from("leads")
            .select("id, name, address_line_1, postcode, stage, cities ( name )")
            .limit(500),
        supabase
            .from("businesses")
            .select("id, name, approval_status, business_locations ( address_line_1, postal_code, city )")
            .limit(500),
    ]);

    const matches: PossibleMatch[] = [];

    for (const lead of leads ?? []) {
        if (lead.id === ignoreLeadId) continue;
        if (compare(lead.name) !== key) continue;

        const cities = lead.cities as { name: string } | { name: string }[] | null;
        const town = Array.isArray(cities) ? cities[0]?.name : cities?.name;

        matches.push({
            kind: "lead",
            id: lead.id,
            name: lead.name,
            where: [lead.address_line_1, town, lead.postcode].filter(Boolean).join(", ") || null,
            note:
                lead.postcode && postcode && lead.postcode === postcode
                    ? "Already a lead, at this postcode"
                    : "Already a lead",
        });
    }

    for (const business of businesses ?? []) {
        if (compare(business.name) !== key) continue;

        const locations = business.business_locations as
            | { address_line_1: string | null; postal_code: string | null; city: string | null }[]
            | null;
        const location = locations?.[0];

        matches.push({
            kind: "business",
            id: business.id,
            name: business.name,
            where:
                [location?.address_line_1, location?.city, location?.postal_code]
                    .filter(Boolean)
                    .join(", ") || null,
            // The one that matters: writing to somebody already on
            // Promotello to ask them to join it.
            note:
                business.approval_status === "approved"
                    ? "Already on Promotello"
                    : `Already a business here (${business.approval_status})`,
        });
    }

    return matches;
}

export async function addLead(
    formData: FormData,
): Promise<{ error?: string; matches?: PossibleMatch[]; leadId?: string }> {
    const supabase = await adminClient();

    const name = text(formData, "name");

    if (!name) {
        return { error: "Give the business a name." };
    }

    const postcode = normalisePostcode(text(formData, "postalCode"));
    const line1 = text(formData, "addressLine1");

    // Shown once, and only once: pressing Add again after reading them is
    // the answer, not a loop.
    if (text(formData, "confirmed") !== "1") {
        const matches = await possibleMatches(supabase, name, postcode);

        if (matches.length > 0) {
            return { matches };
        }
    }

    const { cityId, areaId } = await resolveLocation(supabase, formData);

    const { data: lead, error } = await supabase
        .from("leads")
        .insert({
            name,
            contact_name: text(formData, "contactName") || null,
            website: text(formData, "website") || null,
            email: text(formData, "email") || null,
            // Said by hand, so it is nobody's guess but the person who
            // wrote it: the crawler leaves a typed email alone the same
            // way it leaves a typed address alone.
            email_source: text(formData, "email") ? "typed" : null,
            email_found_at: text(formData, "email") ? new Date().toISOString() : null,
            phone: text(formData, "phone") || null,
            instagram_handle: text(formData, "instagramHandle") || null,
            category_id: text(formData, "categoryId") || null,
            city_id: cityId,
            area_id: areaId,
            address_line_1: line1 || null,
            address_line_2: text(formData, "addressLine2") || null,
            postcode,
            address_source: line1 || postcode ? "typed" : null,
            address_found_at: line1 || postcode ? new Date().toISOString() : null,
            stage: "new",
        })
        .select("id")
        .single();

    // 23505 is the unique index in 20270207090000: this business is
    // already on the list. Usually the button pressed twice, so it says
    // which one it is rather than treating it as a failure.
    // The index, which catches the exact repeat the warning above cannot
    // when two requests are already running.
    if (error?.code === "23505") {
        return { error: "That business is already on the list." };
    }

    if (error || !lead) {
        return { error: error?.message ?? "The lead couldn't be saved." };
    }

    await record(supabase, lead.id, "added", name);

    revalidatePath("/admin/sales");
    return { leadId: lead.id };
}

// Reads their own site for the address they publish. Writes down where it
// came from, because "this was on your contact page" is the answer to
// "how did you get this".
export async function enrichLead(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    const { data: lead } = await supabase
        .from("leads")
        .select("id, website, stage, address_source, email_source")
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

    // A typed email is left alone, the same as a typed address: somebody
    // looked it up and wrote it down, and a crawler guessing from a
    // footer does not outrank that.
    if (found.email && lead.email_source !== "typed") {
        update.email = found.email;
        update.email_source = found.source;
        update.email_found_at = now;
    }

    // Their own published address replaces the provisional one from the
    // import, which is Google's and not ours to keep (20270202090000). A
    // typed one is left alone: somebody looked at it on purpose.
    if (found.address && lead.address_source !== "typed") {
        update.address_source = "website";
        update.address_found_at = now;

        // In the shape the preview asks for, so building one is a glance
        // rather than typing it all again from the page beside it.
        const split = splitAddress(found.address);
        update.address_line_1 = split.line1;
        if (split.postcode) update.postcode = split.postcode;
    }

    await supabase.from("leads").update(update).eq("id", leadId);

    if (found.email && lead.email_source !== "typed") {
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
        .select("id, can_email, stage")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) redirect("/admin/sales");

    // Pressing Move on the stage it is already in wrote an event anyway.
    // Joe's Bakery has "Moved to emailable" twice, nine seconds apart,
    // which is a history of the button being pressed rather than of
    // anything happening to the business.
    if (lead.stage === stage) {
        revalidatePath(`/admin/sales/${leadId}`);
        return;
    }

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
        social: "followed_social",
        emailed: "emailed",
        followed_up: "followed_up",
        letter: "letter_sent",
        claimed: "claimed",
        not_interested: "closed",
        dead: "closed",
    };

    // By the name on the board, not the key underneath it. "Moved to
    // emailable" named something the pipeline calls "Company checked",
    // so the history and the thing it describes disagreed.
    await record(
        supabase,
        leadId,
        kinds[stage] ?? "note",
        kinds[stage] ? undefined : `Moved to ${STAGE_LABELS[stage] ?? stage}`,
    );

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
        .select("id, name, email, contact_name, personal_line, can_email, preview_business_id")
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

    // A follow-up only means anything if there was something to follow.
    //
    // Both buttons sat side by side and neither knew about the other, so
    // a follow-up could be queued — and sent — to a business that had
    // never heard from us. It reads "just checking you saw the preview
    // I made", which is a worse first impression than silence.
    //
    // Asked of outreach_messages rather than the stage, because a stage
    // can be dragged by hand and what was actually sent cannot.
    if (kind === "follow_up") {
        const { data: first } = await supabase
            .from("outreach_messages")
            .select("id")
            .eq("lead_id", leadId)
            .eq("kind", "first")
            .eq("status", "sent")
            .maybeSingle();

        if (!first) {
            await record(
                supabase,
                leadId,
                "note",
                "Not queued: the first email has not gone yet, so there is nothing to follow up.",
            );
            revalidatePath(`/admin/sales/${leadId}`);
            return;
        }
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

    const row = preview as unknown as PreviewRow;
    const placesLeft = await foundingPlacesLeft();

    // Both emails now live in lib/preview-email.ts, and the follow-up
    // goes as a reply in the same thread, so its subject is the first
    // one with Re: in front rather than a new one of its own.
    const draft =
        kind === "first"
            ? {
                subject: outreachSubject(row),
                body: outreachMessage({
                    preview: row,
                    placesLeft,
                    contactName: lead.contact_name,
                    personalLine: lead.personal_line,
                }),
            }
            : {
                subject: followUpSubject(row),
                body: outreachFollowUp({ preview: row, placesLeft, contactName: lead.contact_name }),
            };

    const { error } = await supabase.from("outreach_messages").insert({
        lead_id: leadId,
        kind,
        to_email: lead.email,
        subject: draft.subject,
        // The signature goes on here rather than inside the composer, so
        // what is stored is what is read in the outbox and what is sent:
        // the letter, then Harry's sign-off and the registered office it
        // carries.
        body: withSignature(draft.body),
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

// An address somebody looked up and typed. Wherever they found it — the
// shop's own site, a search, the front of the building — it is a fact
// about a business on a street, and typing it is not caching anybody's
// API response. It outranks both the provisional import and the crawler,
// which is why enrichment leaves a typed address alone.
export async function saveLeadAddress(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");
    const line1 = text(formData, "addressLine1");
    const typedPostcode = postcodeFrom(text(formData, "postalCode"));

    // The town and the area are on this form now, so they are saved
    // whatever happens to the street line — clearing an address somebody
    // got wrong should not also throw away the town they just corrected.
    const { cityId, areaId } = await resolveLocation(supabase, formData);
    const town = text(formData, "city") || null;

    const where = {
        ...(cityId ? { city_id: cityId } : {}),
        ...(areaId ? { area_id: areaId } : {}),
    };

    if (!line1) {
        await supabase
            .from("leads")
            .update({
                ...where,
                address_line_1: null,
                address_line_2: null,
                address_source: null,
                address_found_at: null,
                ...(typedPostcode ? { postcode: typedPostcode } : {}),
            })
            .eq("id", leadId);

        await record(supabase, leadId, "note", "Address cleared.");
        revalidatePath(`/admin/sales/${leadId}`);
        redirect(`/admin/sales/${leadId}?saved=address`);
    }


    await supabase
        .from("leads")
        .update({
            ...where,
            address_line_1: line1,
            address_line_2: text(formData, "addressLine2") || null,
            address_source: "typed",
            address_found_at: new Date().toISOString(),
            ...(typedPostcode ? { postcode: typedPostcode } : {}),
        })
        .eq("id", leadId);

    await record(supabase, leadId, "note", `Address entered by hand: ${[line1, town, typedPostcode].filter(Boolean).join(", ")}`);
    revalidatePath(`/admin/sales/${leadId}`);
}

// Removing a lead, for the ones added twice or added by mistake.
//
// lead_events and outreach_messages both cascade, so deleting a lead we
// have written to destroys the record that we wrote to them — including
// anybody who replied "no thanks". That record is the reason we would
// not email them again, so a lead that has been emailed cannot be
// deleted. Closed and Not interested are the stages for those; they keep
// the history and take it off the list.
export async function deleteLead(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    const { data: lead } = await supabase
        .from("leads")
        .select("id, name, preview_business_id")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) redirect("/admin/sales");

    const { count: written } = await supabase
        .from("outreach_messages")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", leadId);

    if (written && written > 0) {
        redirect(`/admin/sales/${leadId}?undeletable=emailed`);
    }

    // A preview is a business and a page of its own, built by hand. It
    // outlives the lead that prompted it, so this refuses rather than
    // quietly leaving one orphaned.
    if (lead.preview_business_id) {
        redirect(`/admin/sales/${leadId}?undeletable=preview`);
    }

    const { error } = await supabase.from("leads").delete().eq("id", leadId);

    if (error) {
        redirect(`/admin/sales/${leadId}?undeletable=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/admin/sales");
    redirect(`/admin/sales?removed=${encodeURIComponent(lead.name)}`);
}

// Everything about a lead that is not its address or its company, in
// one form. Typed beats found: an email written down here is marked
// typed and the crawler leaves it alone.
export async function saveLeadDetails(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");
    const name = text(formData, "name");

    if (!name) {
        redirect(`/admin/sales/${leadId}?error=no_name`);
    }

    const { data: before } = await supabase
        .from("leads")
        .select("email, email_source")
        .eq("id", leadId)
        .maybeSingle();

    const email = text(formData, "email") || null;
    const changed = email !== (before?.email ?? null);

    const { error } = await supabase
        .from("leads")
        .update({
            name,
            contact_name: text(formData, "contactName") || null,
            personal_line: text(formData, "personalLine") || null,
            // Not here: the description is written on the build-preview
            // page, where it is actually used. Reading it from this form
            // would write null over it every time anything else is saved.
            website: text(formData, "website") || null,
            phone: text(formData, "phone") || null,
            instagram_handle: text(formData, "instagramHandle") || null,
            category_id: text(formData, "categoryId") || null,
            email,
            // Only when it actually changed, so saving the rest of the
            // form does not quietly relabel an email the crawler found.
            ...(changed
                ? {
                      email_source: email ? "typed" : null,
                      email_found_at: email ? new Date().toISOString() : null,
                  }
                : {}),
        })
        .eq("id", leadId);

    if (error?.code === "23505") {
        redirect(`/admin/sales/${leadId}?error=duplicate`);
    }

    if (error) {
        redirect(`/admin/sales/${leadId}?error=${encodeURIComponent(error.message)}`);
    }

    if (changed && email) {
        await record(supabase, leadId, "email_found", `${email} — entered by hand`);
    }

    revalidatePath(`/admin/sales/${leadId}`);
    redirect(`/admin/sales/${leadId}?saved=details`);
}

// A company looked up by hand and written down. Stored exactly as the
// API check stores it, because it is the same fact arriving by a
// different route — somebody read the register instead of us calling
// it. The gate in 20270131090000 still decides what it unlocks: a
// number is what makes a lead emailable, and without one it stays post
// only whatever is typed here.
export async function saveLeadCompany(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    // Companies House numbers are eight characters: digits, or two
    // letters and six digits. Spaces out, upper case, so the same
    // company typed two ways is the same company.
    const number = text(formData, "companyNumber").replace(/\s/g, "").toUpperCase();
    const companyName = text(formData, "companyName");

    if (!number) {
        const { error: cleared } = await supabase
            .from("leads")
            .update({ company_number: null, company_name: null, can_email: false })
            .eq("id", leadId);

        if (cleared) redirect(`/admin/sales/${leadId}?error=${encodeURIComponent(cleared.message)}`);

        await record(supabase, leadId, "companies_house_checked", "Company cleared by hand — post only");
        revalidatePath(`/admin/sales/${leadId}`);
        redirect(`/admin/sales/${leadId}?saved=company`);
    }

    if (!/^(\d{8}|[A-Z]{2}\d{6})$/.test(number)) {
        redirect(`/admin/sales/${leadId}?error=bad_company_number`);
    }

    const { error } = await supabase
        .from("leads")
        .update({
            company_number: number,
            company_name: companyName || null,
            can_email: true,
            companies_house_checked_at: new Date().toISOString(),
        })
        .eq("id", leadId);

    if (error) {
        redirect(`/admin/sales/${leadId}?error=${encodeURIComponent(error.message)}`);
    }

    await record(
        supabase,
        leadId,
        "companies_house_checked",
        `${companyName || "Company"} · ${number} — entered by hand`,
    );

    revalidatePath(`/admin/sales/${leadId}`);
    redirect(`/admin/sales/${leadId}?saved=company`);
}

// A preview, built from the lead that prompted it.
//
// This was a page of its own that asked again for the name, the
// category, the address, who to write to and their email — all of which
// are on the lead you pressed the button from. Typed twice is a chance
// to type them differently, so now only the things a lead cannot answer
// are asked: what the offer is, what the card gives, and what the place
// looks like.
//
// Returns the business id rather than redirecting, because the images
// have nowhere to go until the business exists and the dialog uploads
// them straight afterwards.
export async function createPreviewFromLead(
    formData: FormData,
): Promise<{ businessId?: string; error?: string }> {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    const { data: lead } = await supabase
        .from("leads")
        .select(
            "id, name, description, email, contact_name, website, instagram_handle, address_line_1, address_line_2, postcode, category_id, preview_business_id, categories ( slug ), cities ( name ), areas ( name )",
        )
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) return { error: "That lead has gone." };

    if (lead.preview_business_id) {
        return { error: "This lead already has a preview." };
    }

    const one = <T,>(value: T | T[] | null | undefined): T | undefined =>
        Array.isArray(value) ? value[0] : (value ?? undefined);

    const category = one(lead.categories as { slug: string } | { slug: string }[] | null);
    const city = one(lead.cities as { name: string } | { name: string }[] | null);
    const area = one(lead.areas as { name: string } | { name: string }[] | null);

    // Named rather than counted: "something is missing" sends somebody
    // hunting through a form they cannot see.
    // Written here rather than on the lead: this is the page it appears
    // on, and the moment somebody is deciding how to describe them. Kept
    // on the lead so a rebuilt preview starts from what was written
    // before.
    const description = text(formData, "description") || lead.description;

    const missing = [
        !description && "a description",
        !category && "a category",
        !lead.address_line_1 && "a street address",
        !lead.postcode && "a postcode",
        !city && "a town",
        !area && "an area",
    ].filter(Boolean);

    if (missing.length > 0) {
        return { error: `The lead still needs ${missing.join(", ")}. Add it on the lead and try again.` };
    }

    const sampleOffer = text(formData, "sampleOffer");
    const sampleReward = text(formData, "sampleReward");
    const stamps = Number(formData.get("sampleStamps"));

    if (sampleOffer.length < 3 || sampleReward.length < 3) {
        return { error: "Add a sample offer and a loyalty reward." };
    }

    const { data: businessId, error } = await supabase.rpc("create_business_with_owner", {
        business_name: lead.name,
        business_category: category!.slug,
        business_description: description,
        business_website_url: lead.website,
        business_contact_email: lead.email,
        location_name: "Main location",
        location_address_line_1: lead.address_line_1,
        location_address_line_2: lead.address_line_2,
        location_city: city!.name,
        location_region: area!.name,
        location_postal_code: lead.postcode,
        location_country_code: "GB",
    });

    if (error || !businessId) {
        return { error: error?.message ?? "The business couldn't be created." };
    }

    const { data: user } = await supabase.auth.getUser();

    const { error: previewError } = await supabase.from("business_previews").insert({
        business_id: businessId,
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

    await supabase
        .from("leads")
        .update({ preview_business_id: businessId, stage: "preview", description })
        .eq("id", leadId);

    await record(supabase, leadId, "preview_built", lead.name);

    revalidatePath(`/admin/sales/${leadId}`);
    return { businessId };
}

// Deletes an unclaimed preview and the business built for it, and lets
// the lead go back to not having one. The RPC refuses a claimed preview,
// so this cannot take a live business with it.
export async function deleteLeadPreview(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");
    const businessId = text(formData, "businessId");

    const { error } = await supabase.rpc("delete_business_preview", {
        requested_business_id: businessId,
    });

    if (error) {
        redirect(`/admin/sales/${leadId}?error=${encodeURIComponent(error.message)}`);
    }

    await supabase
        .from("leads")
        .update({ preview_business_id: null, stage: "emailable" })
        .eq("id", leadId);

    await record(supabase, leadId, "note", "Preview deleted.");

    revalidatePath(`/admin/sales/${leadId}`);
    redirect(`/admin/sales/${leadId}?saved=preview_deleted`);
}

// The letter. The last thing in the sequence, and the only one that
// costs money and cannot be taken back.
//
// Two ways in, deliberately different: a preview makes a sample PDF at
// Stannp and charges nothing, and posting asks for the word "post" to
// be typed. Nothing here is one click away from a letterbox.
export async function previewLetter(formData: FormData): Promise<{ pdf?: string; error?: string }> {
    return letterFor(formData, false);
}

export async function postLetter(formData: FormData) {
    const leadId = text(formData, "leadId");

    // Typed out in full, like closing a business. A letter is £0.88 and
    // somebody's doormat, and a misplaced click should not reach either.
    if (text(formData, "confirm").trim().toLowerCase() !== "post") {
        redirect(`/admin/sales/${leadId}?error=say_post`);
    }

    const result = await letterFor(formData, true);

    if (result.error) {
        redirect(`/admin/sales/${leadId}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/admin/sales/${leadId}?saved=letter`);
}

async function letterFor(formData: FormData, live: boolean): Promise<{ pdf?: string; error?: string }> {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    const { data: lead } = await supabase
        .from("leads")
        .select(
            "id, name, contact_name, personal_line, address_line_1, address_line_2, postcode, preview_business_id, cities ( name )",
        )
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) return { error: "That lead has gone." };

    const to = letterAddress(lead);

    if (!to) return { error: "The lead needs a street address, a town and a postcode before anything can be posted." };

    if (!lead.preview_business_id) return { error: "Build the preview first — the letter is a way to it." };

    const { data: previewRow } = await supabase
        .from("business_previews")
        .select(previewColumns)
        .eq("business_id", lead.preview_business_id)
        .maybeSingle();

    if (!previewRow) return { error: "The preview has gone." };

    const row = previewRow as unknown as PreviewRow;

    // Stannp fetches the background from the internet when it makes the
    // letter, so a local address is one it cannot reach. Said here
    // rather than letting their "Failed to save the background file"
    // stand, which describes the symptom and not the cause.
    const background = absoluteUrl(`/api/letters/${row.token}/background`);

    // Only when we are drawing the page ourselves. A dashboard template
    // carries its own design, so a local address is no obstacle to it.
    if (!letterTemplate() && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(background)) {
        return {
            error: "The letterhead lives at a local address, which Stannp cannot fetch. Either set a Stannp template, or make letters from a deployed site.",
        };
    }

    const previewUrl = absoluteUrl(previewLink(row.token, lead.name));

    const result = await sendLetter({
        to,
        pages: outreachLetter({
            preview: row,
            contactName: lead.contact_name,
            personalLine: lead.personal_line,
        }).replace(/\n/g, "<br>"),
        background,
        // What a dashboard template can put on the page. The same facts
        // the letter's own words use, so the two cannot disagree about
        // which link a business is being sent to.
        merge: {
            business: lead.name,
            previewurl: previewUrl.replace(/^https?:\/\//, ""),
            previewlink: previewUrl,
            personalline: lead.personal_line ?? "",
        },
        live,
        // The same lead and the same day cannot post twice, whatever
        // happens to the button or the connection.
        idempotencyKey: live ? `lead-${leadId}-${new Date().toISOString().slice(0, 10)}` : undefined,
    });

    if (!result.ok) return { error: result.reason };

    if (live) {
        await supabase.from("leads").update({ stage: "letter" }).eq("id", leadId);
        await record(supabase, leadId, "letter_sent", `Posted to ${letterDestination(to)} · £${result.cost}`);
        revalidatePath(`/admin/sales/${leadId}`);
    }

    return { pdf: result.pdf };
}

// Writing down that a DM went.
//
// There is no API for a cold DM and there should not be: one that
// arrived by API would read like one. So the message is copied out of
// the page and pasted into Instagram by hand, and this is the only
// thing that can know it happened — pressed by the person who just sent
// it.
//
// It starts the clock. Until this existed the lead sat at "Following
// them" looking untouched, and a fortnight later the board would say a
// letter was due to a business that had already heard from us.
export async function recordDm(formData: FormData) {
    const supabase = await adminClient();
    const leadId = text(formData, "leadId");

    const { data: lead } = await supabase
        .from("leads")
        .select("id, stage")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) redirect("/admin/sales");

    await record(supabase, leadId, "dm_sent", "Sent on Instagram");

    // Moved on only from the stages before it. A lead that has since
    // been emailed or written to is further along, and a DM noted late
    // should not drag it backwards.
    if (["new", "enriched", "emailable", "preview"].includes(lead.stage)) {
        await supabase.from("leads").update({ stage: "social" }).eq("id", leadId);
    }

    revalidatePath(`/admin/sales/${leadId}`);
    revalidatePath("/admin/sales");
}
