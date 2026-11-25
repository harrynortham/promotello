"use server";

import { revalidatePath } from "next/cache";

import {
    BIO_CORAL,
    BIO_KINDS,
    renumbered,
    tidyUrl,
    type BioKind,
    type BioSection,
} from "@/lib/bio-sections";
import { createClient } from "@/utils/supabase/server";

// Arranging the bio page.
//
// Every write goes through RLS as the person doing it -- bio_sections
// and bio_links are both gated on is_business_member(…, 'admin'), so
// there is no check here that the database is not already making.

type Result = { error?: string };

function isKind(value: string): value is BioKind {
    return (BIO_KINDS as readonly string[]).includes(value);
}

// The whole arrangement at once, because position is only meaningful
// as a set: saving one row's new number leaves the others holding the
// one it used to have.
export async function saveArrangement(
    businessId: string,
    sections: BioSection[],
): Promise<Result> {
    const supabase = await createClient();

    const rows = renumbered(sections.filter((section) => isKind(section.kind))).map((section) => ({
        business_id: businessId,
        kind: section.kind,
        position: section.position,
        enabled: section.enabled,
    }));

    if (rows.length === 0) return { error: "There is nothing to save." };

    const { error } = await supabase
        .from("bio_sections")
        .upsert(rows, { onConflict: "business_id,kind" });

    if (error) return { error: error.message };

    revalidatePath(`/business/${businessId}/bio`);
    return {};
}

export async function addLink(businessId: string, formData: FormData): Promise<Result> {
    const label = String(formData.get("label") ?? "").trim();
    const url = tidyUrl(String(formData.get("url") ?? ""));

    if (!label) return { error: "Give the link a name." };
    if (label.length > 40) return { error: "That name is too long for a row." };
    if (!url) return { error: "That does not look like a web address." };

    const supabase = await createClient();

    // On the end of the list, which is where somebody adding one
    // expects it. They can move it afterwards.
    const { data: last } = await supabase
        .from("bio_links")
        .select("position")
        .eq("business_id", businessId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

    const { error } = await supabase.from("bio_links").insert({
        business_id: businessId,
        label,
        url,
        position: (last?.position ?? -1) + 1,
    });

    if (error) return { error: error.message };

    revalidatePath(`/business/${businessId}/bio`);
    return {};
}

export async function removeLink(businessId: string, linkId: string): Promise<Result> {
    const supabase = await createClient();
    const { error } = await supabase.from("bio_links").delete().eq("id", linkId);

    if (error) return { error: error.message };

    revalidatePath(`/business/${businessId}/bio`);
    return {};
}

export async function moveLink(
    businessId: string,
    linkId: string,
    direction: -1 | 1,
): Promise<Result> {
    const supabase = await createClient();

    const { data: links } = await supabase
        .from("bio_links")
        .select("id, position")
        .eq("business_id", businessId)
        .order("position");

    if (!links) return { error: "Those links could not be read." };

    const from = links.findIndex((link) => link.id === linkId);
    const to = from + direction;

    if (from === -1 || to < 0 || to >= links.length) return {};

    const order = [...links];
    [order[from], order[to]] = [order[to], order[from]];

    const { error } = await supabase.from("bio_links").upsert(
        order.map((link, index) => ({ id: link.id, business_id: businessId, position: index })),
        { onConflict: "id" },
    );

    if (error) return { error: error.message };

    revalidatePath(`/business/${businessId}/bio`);
    return {};
}

// The bits of the page that are not a section: the notice and the
// WhatsApp number. Both live on the business because both are things
// the rest of the site may want to know.
export async function saveBioDetails(businessId: string, formData: FormData): Promise<Result> {
    const notice = String(formData.get("notice") ?? "").trim();
    const until = String(formData.get("noticeUntil") ?? "").trim();
    const whatsapp = String(formData.get("whatsapp") ?? "").trim();
    // Coral is stored as nothing: a business that never chose gets it,
    // and one that chose it is in the same state, which is the truth.
    const accentField = String(formData.get("accent") ?? "").trim();
    const accent = accentField && accentField !== BIO_CORAL ? accentField : null;

    if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
        return { error: "That is not a colour we know." };
    }

    if (notice && notice.length < 3) return { error: "A notice needs a few more words." };
    if (notice.length > 140) return { error: "A notice has to fit on one line." };

    const supabase = await createClient();

    const { error } = await supabase
        .from("businesses")
        .update({
            bio_notice: notice || null,
            bio_notice_until: notice && until ? until : null,
            bio_accent: accent,
            whatsapp: whatsapp || null,
        })
        .eq("id", businessId);

    if (error) return { error: error.message };

    revalidatePath(`/business/${businessId}/bio`);
    return {};
}
