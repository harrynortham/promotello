"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

const kinds = ["welcome", "birthday", "winback"] as const;

export async function saveAutomation(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const kind = String(formData.get("kind") ?? "");
    const path = `/business/${businessId}/automations`;

    if (!kinds.includes(kind as (typeof kinds)[number])) {
        redirect(`${path}?error=invalid`);
    }

    const reward = String(formData.get("reward") ?? "").trim();
    const validDays = Number(formData.get("validDays"));
    const inactiveDays = Number(formData.get("inactiveDays") ?? 60);
    // Optional, both of them: a gift worked without either until now, and
    // making them required would switch off every automation already running.
    const terms = String(formData.get("terms") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();

    if (reward.length < 3 || reward.length > 120 || !(validDays >= 7 && validDays <= 90) || !(inactiveDays >= 30 && inactiveDays <= 365)) {
        redirect(`${path}?error=invalid#${kind}`);
    }

    if (terms.length > 500) {
        redirect(`${path}?error=terms#${kind}`);
    }

    // RLS checks the caller is an admin. It does not check the plan, and
    // nor does a trigger: what stops a business without Growth sending
    // anything is issue_automation_vouchers, which only looks at
    // followers of a business that business_has_growth() says yes to.
    // So a row here may read "on" for a business that is not on Growth
    // -- one that was, and dropped -- and nothing will go out. Those
    // settings are kept on purpose, so coming back turns them on again
    // exactly as they were.
    const { error } = await (await createClient()).from("business_automations").upsert({
        business_id: businessId,
        kind,
        enabled: formData.get("enabled") === "on",
        reward,
        valid_days: validDays,
        inactive_days: inactiveDays,
        terms: terms || null,
        image_url: imageUrl || null,
        updated_at: new Date().toISOString(),
    });

    redirect(error ? `${path}?error=save#${kind}` : `${path}?saved=${kind}#${kind}`);
}
