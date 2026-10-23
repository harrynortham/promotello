"use server";

import { redirect } from "next/navigation";

import { isUnsubscribeToken } from "@/lib/unsubscribe";
import { createPublicClient } from "@/utils/supabase/public";

export async function unsubscribe(formData: FormData) {
    const token = String(formData.get("token") ?? "");
    const everything = formData.get("everything") === "1";

    if (!isUnsubscribeToken(token)) {
        redirect("/");
    }

    const { error } = await createPublicClient().rpc("unsubscribe_by_token", {
        requested_token: token,
        everything,
    });

    redirect(`/unsubscribe/${token}?${error ? "error=1" : `done=${everything ? "all" : "business"}`}`);
}
