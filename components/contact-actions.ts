"use server";

import { createHash } from "crypto";
import { z } from "zod";

import { brandedEmail, sendEmails } from "@/lib/email";
import { email, optionalText, requiredText } from "@/lib/validation";
import { createAdminClient } from "@/utils/supabase/admin";

// Messages from the contact forms (/contact and /business/contact), sent
// to the support inbox with the sender as reply-to, so you can just hit
// Reply. Limited to 3 per email address per 30 minutes.

const CONTACT_INBOX = process.env.CONTACT_EMAIL?.trim() || "support@promotello.com";

const schema = z.object({
    audience: z.enum(["customer", "business"]),
    name: requiredText("Your name", { max: 100 }),
    email,
    business: optionalText("Business name", 150),
    subject: requiredText("A subject", { max: 150 }),
    message: z.string().trim().min(20).max(5000),
    // Honeypot: people never see it, bots fill it in.
    website: z.string(),
});

export type ContactInput = z.input<typeof schema>;

export type ContactResult = { ok: true } | { ok: false; error: "invalid" | "rate_limited" | "failed" };

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, error: "invalid" };
    }

    const values = parsed.data;

    // A bot filled in the hidden field: pretend it worked.
    if (values.website) {
        return { ok: true };
    }

    // The limit is keyed on a hash, so addresses aren't stored.
    const emailHash = createHash("sha256").update(values.email.toLowerCase()).digest("hex");
    const { data: allowed, error } = await createAdminClient().rpc("consume_contact_form_limit", {
        requested_email_hash: emailHash,
    });

    if (error) {
        console.error("Contact form: rate limit check failed", error);
        return { ok: false, error: "failed" };
    }

    if (!allowed) {
        return { ok: false, error: "rate_limited" };
    }

    const from = values.business ? `${values.name} (${values.business})` : values.name;
    const { html, text } = brandedEmail({
        eyebrow: values.audience === "business" ? "Business enquiry" : "Customer message",
        title: values.subject,
        paragraphs: [`From ${from} <${values.email}>`, ...values.message.split(/\n{2,}/)],
        action: { label: `Reply to ${values.name}`, url: `mailto:${values.email}` },
        footer: "Sent from the contact form on promotello.com. Reply to this email to answer.",
    });

    const { sent, failed } = await sendEmails([
        {
            to: CONTACT_INBOX,
            subject: `${values.audience === "business" ? "Business enquiry" : "Contact"}: ${values.subject}`,
            html,
            text,
            replyTo: `${values.name.replace(/["<>\\\r\n]/g, "")} <${values.email}>`,
        },
    ]);

    if (failed > 0 || sent === 0) {
        return { ok: false, error: "failed" };
    }

    return { ok: true };
}
