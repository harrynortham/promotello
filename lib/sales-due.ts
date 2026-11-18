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
export async function flagLeadsDueToday() {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("leads")
        .select("id, name, stage, can_email, updated_at, lead_events ( kind, created_at )")
        .in("stage", ["preview", "emailed", "followed_up"]);

    if (error) {
        console.error("Daily job: could not read the sales pipeline", error);
        return { followUp: 0, letter: 0 };
    }

    // The last time we actually did something to them, rather than the
    // last time the row changed: a note or a typo fix is not a touch.
    const TOUCHES = ["emailed", "followed_up", "letter_sent", "preview_built"];

    const leads: DueLead[] = (data ?? []).map((lead) => {
        const events = (lead.lead_events ?? []) as { kind: string; created_at: string }[];

        const touches = events
            .filter((event) => TOUCHES.includes(event.kind))
            .map((event) => event.created_at)
            .sort();

        return {
            id: lead.id,
            name: lead.name,
            stage: lead.stage,
            can_email: lead.can_email,
            last_touch: touches[touches.length - 1] ?? null,
        };
    });

    const { followUp, letter } = dueToday(leads, new Date());

    // Written down rather than emailed to ourselves: the board is where
    // this is read, and a note on the lead is what makes it visible
    // there without inventing a second inbox.
    for (const lead of followUp) {
        await supabase.from("lead_events").insert({
            lead_id: lead.id,
            kind: "note",
            detail: "Due a follow-up.",
        });
    }

    for (const lead of letter) {
        await supabase.from("lead_events").insert({
            lead_id: lead.id,
            kind: "note",
            detail: lead.can_email
                ? "A fortnight with no reply. Worth a letter."
                : "A fortnight gone, and we may not email them. A letter is the only way in.",
        });
    }

    return { followUp: followUp.length, letter: letter.length };
}
