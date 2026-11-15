import { createAdminClient } from "@/utils/supabase/admin";

// Who an email is going to, and what to call them.
//
// Nobody is made to give a name, so a greeting is a thing an email has
// sometimes rather than a field it fills. Every caller reads null as "no
// greeting" and writes a sentence that reads properly without one —
// never "Hi ," and never a stand-in like "there" where a real name would
// have gone (lib/account-emails.ts has done it this way from the start).

export type Recipient = { email: string; name: string | null };

export function firstNameOf(fullName: string | null | undefined) {
    const first = (fullName ?? "").trim().split(/\s+/)[0] ?? "";

    return first === "" ? null : first;
}

// "Hi Sam. " or "", to open a paragraph with.
export function greeting(name: string | null | undefined) {
    const first = firstNameOf(name);

    return first ? `Hi ${first}. ` : "";
}

export async function businessRecipients(businessId: string): Promise<Recipient[]> {
    const { data, error } = await createAdminClient().rpc("business_manager_contacts", {
        requested_business_id: businessId,
    });

    if (error) {
        console.error("Could not read who to write to", error);
        return [];
    }

    return ((data ?? []) as { email: string | null; full_name: string | null }[])
        .filter((row): row is { email: string; full_name: string | null } => Boolean(row.email))
        .map((row) => ({ email: row.email, name: row.full_name }));
}
