"use server";

import { z } from "zod";

import { contactInbox, escapeHtml, sendEmails } from "@/lib/email";
import { createClient } from "@/utils/supabase/server";

// Feedback from a business's dashboard. It is stored so it can be worked
// through later, and a copy goes to the support inbox so it is not only
// found by someone remembering to look.

const schema = z.object({
    businessId: z.string().uuid(),
    kind: z.enum(["idea", "problem", "other"]),
    message: z.string().trim().min(10, "Tell us a little more.").max(2000),
    // The dashboard page they were on, for context.
    page: z.string().trim().max(200).optional(),
});

export type FeedbackInput = z.input<typeof schema>;

export type FeedbackResult = { ok: true } | { ok: false; error: "invalid" | "failed" };

const kindLabels: Record<string, string> = {
    idea: "Idea or request",
    problem: "Something's wrong",
    other: "Something else",
};

export async function sendBusinessFeedback(input: FeedbackInput): Promise<FeedbackResult> {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, error: "invalid" };
    }

    const { businessId, kind, message, page } = parsed.data;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "failed" };
    }

    // Row-level security checks they are on this business's team.
    const { error } = await supabase.from("business_feedback").insert({
        business_id: businessId,
        user_id: user.id,
        kind,
        message,
        page: page || null,
    });

    if (error) {
        console.error("Business feedback: could not save", error);
        return { ok: false, error: "failed" };
    }

    // The business name makes the email worth reading on its own.
    const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .maybeSingle<{ name: string }>();

    const name = business?.name ?? "A business";
    const heading = kindLabels[kind] ?? "Feedback";

    await sendEmails([
        {
            to: contactInbox,
            subject: `${heading} from ${name}`,
            html:
                `<p><strong>${escapeHtml(heading)}</strong> from ${escapeHtml(name)}` +
                `${page ? ` on ${escapeHtml(page)}` : ""}, sent by ${escapeHtml(user.email ?? "a team member")}.</p>` +
                `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
            text: `${heading} from ${name}${page ? ` on ${page}` : ""}, sent by ${user.email ?? "a team member"}.\n\n${message}`,
            replyTo: user.email ?? undefined,
        },
    ]).catch((emailError) => {
        // It is saved either way; a failed email should not look like a
        // failed submission to the business.
        console.error("Business feedback: could not email", emailError);
    });

    return { ok: true };
}
