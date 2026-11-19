import type { SupabaseClient } from "@supabase/supabase-js";
import { dueToday, type DueLead } from "@/lib/sales-pipeline";
import { createAdminClient } from "@/utils/supabase/admin";

// Who is due the next touch today.
//
// It flags; it does not send. The sequence — first email, a follow-up
// four or five days later, a letter after a fortnight — is approved and
// sent by a person, which is the whole point of the queue. This job's
// job is that nobody has to remember whose turn it is.
//
// The decision is in dueToday(), which is pure and takes "now", so the
// dates are tested rather than waited for.
// The last time we actually did something to them, rather than the last
// time the row changed: a note or a typo fix is not a touch.
//
// followed_social belongs here for the same reason the stage does: it
// is a thing we did to them on a day, and without it a lead whose only
// touch was being followed had no age at all — so the rule skipped it
// and a sole trader could sit in Following them for good.
const TOUCHES = ["emailed", "followed_up", "letter_sent", "preview_built", "followed_social"];

// The columns dueToday() needs, wherever it is asked from.
export const dueColumns =
    "id, name, stage, can_email, lead_events ( kind, created_at ), outreach_messages ( kind, status, sent_at )";

// One shape, built one way. The board asks this live and the daily job
// asks it at eight in the morning — if they built the rows differently
// the board would show one answer and the note would say another.
export function toDueLeads(rows: unknown[]): DueLead[] {
    return (rows as DueRow[]).map((lead) => {
        const touches = (lead.lead_events ?? [])
            .filter((event) => TOUCHES.includes(event.kind))
            .map((event) => event.created_at)
            .sort();

        // What was sent, from the record of sending it.
        const sent = (lead.outreach_messages ?? []).filter((message) => message.status === "sent");

        return {
            id: lead.id,
            name: lead.name,
            stage: lead.stage,
            can_email: lead.can_email,
            last_touch: touches[touches.length - 1] ?? null,
            first_sent_at: sent.find((message) => message.kind === "first")?.sent_at ?? null,
            follow_up_sent_at: sent.find((message) => message.kind === "follow_up")?.sent_at ?? null,
        };
    });
}

type DueRow = {
    id: string;
    name: string;
    stage: string;
    can_email: boolean;
    lead_events?: { kind: string; created_at: string }[] | null;
    outreach_messages?: { kind: string; status: string; sent_at: string | null }[] | null;
};

// The stages a lead can be waiting in. Claimed, Not interested and
// Closed are finished with; the earlier ones have not been written to
// yet, so nothing is owed.
export const WAITING_STAGES = ["preview", "social", "emailed", "followed_up"];

export async function flagLeadsDueToday() {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("leads")
        .select(dueColumns)
        .in("stage", WAITING_STAGES);

    if (error) {
        console.error("Daily job: could not read the sales pipeline", error);
        return { followUp: 0, letter: 0 };
    }

    const leads = toDueLeads(data ?? []);

    const { followUp, letter } = dueToday(leads, new Date());

    // The board works this out for itself now, live, so what is due is
    // visible without waiting for tomorrow's run. The note is the record
    // that the day came — useful in the history, which is why it is
    // still written.
    //
    // Once, though. A lead stays due every day until it is dealt with,
    // and re-inserting the same sentence each morning turned a week of
    // waiting into seven identical notes and buried everything real
    // underneath them.
    const notes: { lead_id: string; kind: string; detail: string }[] = [];

    for (const lead of followUp) {
        notes.push({ lead_id: lead.id, kind: "note", detail: "Due a follow-up." });
    }

    for (const lead of letter) {
        notes.push({
            lead_id: lead.id,
            kind: "note",
            detail: lead.can_email
                ? "A fortnight with no reply. Worth a letter."
                : "A fortnight gone, and we may not email them. A letter is the only way in.",
        });
    }

    const fresh = await notYetSaid(supabase, notes);

    if (fresh.length > 0) await supabase.from("lead_events").insert(fresh);

    return { followUp: followUp.length, letter: letter.length };
}

// Which of these has not been said on that lead already. One query for
// the lot rather than one each, since this runs over every lead in the
// pipeline.
async function notYetSaid(
    supabase: SupabaseClient,
    notes: { lead_id: string; kind: string; detail: string }[],
) {
    if (notes.length === 0) return [];

    const { data: existing } = await supabase
        .from("lead_events")
        .select("lead_id, detail")
        .eq("kind", "note")
        .in("lead_id", notes.map((note) => note.lead_id));

    const said = new Set((existing ?? []).map((row) => `${row.lead_id}\u0000${row.detail}`));

    return notes.filter((note) => !said.has(`${note.lead_id}\u0000${note.detail}`));
}
