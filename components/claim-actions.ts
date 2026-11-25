"use server";

import { z } from "zod";

import { brandedEmail, contactInbox, sendEmails } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { email, requiredText } from "@/lib/validation";
import { createClient } from "@/utils/supabase/server";

// "Is this your business?" on a page we published before anybody claimed
// it. This files a request and nothing else: request_page_claim() cannot
// make anyone an owner, and the claim link is sent by an admin from
// /admin/sales once they are satisfied. The secret token is still the
// only thing that hands a page over.

const schema = z.object({
    businessId: z.string().uuid(),
    name: requiredText("Your name", { max: 80 }),
    email,
    connection: requiredText("How you're connected to it", { max: 200 }),
    // Honeypot: people never see it, bots fill it in.
    website: z.string(),
});

export type ClaimRequestInput = z.input<typeof schema>;

export type ClaimRequestResult =
    | { ok: true }
    | { ok: false; error: "invalid" | "unavailable" | "failed" };

export async function requestPageClaim(input: ClaimRequestInput): Promise<ClaimRequestResult> {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, error: "invalid" };
    }

    const values = parsed.data;

    // A bot filled in the hidden field: pretend it worked.
    if (values.website) {
        return { ok: true };
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("request_page_claim", {
        requested_business_id: values.businessId,
        contact_name: values.name,
        contact_email: values.email,
        connection: values.connection,
    });

    if (error) {
        console.error("Could not file a page claim request", error);

        // The page has been claimed, taken down or approved since it was
        // loaded. Nothing they can fix by trying again.
        if (error.code === "P0002" || error.code === "22023") {
            return { ok: false, error: "unavailable" };
        }

        return { ok: false, error: "failed" };
    }

    // The request is in the admin queue either way; this is so it does
    // not sit there unseen for a week.
    const { data: business } = await supabase
        .from("businesses")
        .select("name, slug")
        .eq("id", values.businessId)
        .maybeSingle();

    const name = business?.name ?? "a business";

    await sendEmails([
        {
            to: contactInbox,
            subject: `Page claim: ${name}`,
            ...brandedEmail({
                eyebrow: "Claim request",
                title: `${values.name} says ${name} is theirs`,
                paragraphs: [
                    `${values.name} (${values.email}) asked for the claim link to ${name}.`,
                    `How they say they're connected: “${values.connection}”`,
                    "Release the page from the lead in your sales dashboard, and the claim link goes to the address above.",
                ],
                action: { label: "Open the claim requests", url: absoluteUrl("/admin/sales") },
                footer: "Sent by Promotello because somebody asked to claim a page you published.",
            }),
        },
    ]).catch((sendError) => {
        // The request is already filed. An email that didn't go is worth
        // a log and nothing more: losing it would lose the business.
        console.error("Could not email the claim request", sendError);
    });

    return { ok: true };
}
