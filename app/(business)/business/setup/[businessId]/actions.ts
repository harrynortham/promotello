"use server";

import type { FunnelStepId } from "@/lib/funnel";
import { trackOnboarding, type OnboardingEvent } from "@/lib/onboarding-events";
import { isSetupStepId, type SetupStepId } from "@/lib/setup-steps";
import { createClient } from "@/utils/supabase/server";

// The setup flow saves from the browser, so the only way to know somebody
// looked at a step and gave up is for the browser to say so. It says only
// which step and what went wrong; who they are and whether the business is
// theirs is settled here, where it can't be made up.

const funnelStep: Record<SetupStepId, FunnelStepId> = {
    logo: "logo_added",
    description: "description_added",
    address: "address_added",
    hours: "hours_added",
    cover: "cover_added",
    review: "sent_for_review",
    offer: "first_offer_published",
};

// Finishing these two is already written down — the business row carries
// review_requested_at, and an approved offer is in the audit log — so only
// what somebody tried and couldn't do is new.
const completionIsRecordedElsewhere: SetupStepId[] = ["review", "offer"];

export async function recordSetupStep(
    businessId: string,
    step: string,
    event: OnboardingEvent,
    metadata?: Record<string, string>,
) {
    if (!isSetupStepId(step)) {
        return;
    }

    if (event === "step_completed" && completionIsRecordedElsewhere.includes(step)) {
        return;
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return;
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        return;
    }

    await trackOnboarding(funnelStep[step], {
        businessId,
        userId: user.id,
        event,
        metadata,
    });
}
