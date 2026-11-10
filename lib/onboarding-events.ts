import * as Sentry from "@sentry/nextjs";

import type { FunnelStepId } from "@/lib/funnel";
import { createAdminClient } from "@/utils/supabase/admin";

// Recording where a business got to while setting up. Server-side only,
// and written with the service role: onboarding_events has no insert
// policy, so nothing in a browser can claim a business did something.
//
// Most of the funnel is worked out from tables we already keep — see
// onboarding_step_times() in the migration. This is for the steps nothing
// else writes down: the setup steps themselves, which only ever store what
// a page is now and never when it got that way.
//
// It must never be the reason somebody's save failed. Everything here is
// best effort: a logging failure is reported to us, not to them.

export type OnboardingEvent = "step_completed" | "step_viewed" | "step_failed";

export type OnboardingContext = {
    businessId?: string | null;
    userId?: string | null;
    // Somebody who pressed Claim before they had an account: the token is
    // the only handle on them until one exists.
    previewToken?: string | null;
    event?: OnboardingEvent;
    metadata?: Record<string, unknown>;
};

export async function trackOnboarding(step: FunnelStepId, context: OnboardingContext = {}) {
    const { businessId = null, userId = null, previewToken = null, event = "step_completed", metadata } = context;

    try {
        const { error } = await createAdminClient().from("onboarding_events").insert({
            business_id: businessId,
            user_id: userId,
            preview_token: previewToken,
            event,
            step,
            metadata: metadata ?? {},
        });

        if (error) {
            throw new Error(error.message);
        }
    } catch (failure) {
        // Reported rather than thrown: the business was getting on with
        // something, and this is us taking notes.
        console.error("Onboarding event not recorded", step, failure);
        Sentry.captureMessage(
            `Onboarding event not recorded (${event} ${step}): ${failure instanceof Error ? failure.message : String(failure)}`,
            "warning",
        );
    }
}
