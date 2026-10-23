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

    const admin = createAdminClient();

    // Businesses only this person runs go with the account.
    for (const { business_id } of outcomes) {
        const { error: businessError } = await admin.from("businesses").delete().eq("id", business_id);

        if (businessError) {
            console.error("Account deletion: business delete failed", businessError);
            return { error: "We couldn't delete your business. Please contact us." };
        }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
        console.error("Account deletion: user delete failed", deleteError);
        return { error: "We couldn't delete your account. Please contact us." };
    }

    // Clear the session cookies for the deleted user.
    await supabase.auth.signOut();
    redirect("/?account=deleted");
}
