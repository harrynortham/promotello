"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type DeletionOutcome = {
    business_id: string;
    business_name: string;
    outcome: "delete" | "hand_over" | "cancel_subscription";
};

export async function deleteAccount(_: unknown, formData: FormData) {
    if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
        return { error: "Type DELETE to confirm." };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/account/privacy");
    }

    // Check again on the server: the page may be out of date.
    const { data, error } = await supabase.rpc("account_deletion_check");

    if (error) {
        return { error: "We couldn't check your businesses. Please try again." };
    }

    const outcomes = (data ?? []) as DeletionOutcome[];

    if (outcomes.some((item) => item.outcome !== "delete")) {
        return { error: "Sort out the businesses listed above first." };
    }

    // Businesses only this person runs are closed, not deleted. Deleting
    // cascaded through offers, redemptions, loyalty cards and stamps, which
    // took customers' records with it and left every printed QR code
    // pointing at nothing. Closing unlists it and leaves all of that intact
    // for an admin to erase properly.
    for (const { business_id } of outcomes) {
        const { error: closeError } = await supabase.rpc("close_business", {
            requested_business_id: business_id,
        });

        if (closeError && closeError.code !== "P0008") {
            console.error("Account deletion: closing the business failed", closeError);
            return { error: "We couldn't close your business. Please contact us." };
        }
    }

    const admin = createAdminClient();

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
        console.error("Account deletion: user delete failed", deleteError);
        return { error: "We couldn't delete your account. Please contact us." };
    }

    // Clear the session cookies for the deleted user.
    await supabase.auth.signOut();
    redirect("/?account=deleted");
}
