"use server";

import { redirect } from "next/navigation";

import { guestCardEmail } from "@/lib/guest-card-email";
import { sendEmails } from "@/lib/email";
import { createClient } from "@/utils/supabase/server";

export async function joinLoyaltyProgram(formData: FormData) {
    const programId = String(formData.get("programId") ?? "");
    const businessId = String(formData.get("businessId") ?? "");
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/businesses/${businessId}`)}`);
    }

    const { error } = await supabase.rpc("join_loyalty_program", {
        requested_program_id: programId,
    });

    if (error) {
        redirect(`/businesses/${businessId}?loyalty=unavailable#loyalty`);
    }

    redirect(`/dashboard/loyalty?joined=${programId}`);
}

// Joining without an account: a name and an email are enough, and the card
// opens straight away. The link is emailed too, because the tab they joined
// in is the only other way back to it.
export async function joinLoyaltyAsGuest(formData: FormData) {
    const programId = String(formData.get("programId") ?? "");
    const businessId = String(formData.get("businessId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const guestEmail = String(formData.get("email") ?? "").trim();

    const back = (reason: string) =>
        `/businesses/${businessId}?loyalty=${reason}#loyalty`;

    if (!name || !guestEmail) {
        redirect(back("details"));
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .rpc("join_loyalty_program_as_guest", {
            requested_program_id: programId,
            requested_name: name,
            requested_email: guestEmail,
        })
        .maybeSingle<{ guest_token: string; card_code: string }>();

    if (error || !data?.guest_token) {
        // Someone with an account for this email is told to sign in instead.
        redirect(back(error?.message?.includes("sign in") ? "signin" : "unavailable"));
    }

    const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .maybeSingle<{ name: string }>();

    await sendEmails([
        guestCardEmail({
            to: guestEmail,
            name,
            businessName: business?.name ?? "the business",
            token: data.guest_token,
        }),
    ]).catch((emailError) => {
        // The card exists either way; they are about to see it.
        console.error("Guest loyalty card: could not email the link", emailError);
    });

    redirect(`/card/${data.guest_token}?joined=1`);
}
