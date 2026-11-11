import type { OnboardingEvent } from "@/lib/onboarding-events";

import { recordSetupStep } from "./actions";

// Taking notes must never be in anybody's way: this is sent and forgotten,
// and a failure to record it is not a failure to save anything.
export function trackStep(
    businessId: string,
    step: string,
    event: OnboardingEvent,
    metadata?: Record<string, string>,
) {
    void recordSetupStep(businessId, step, event, metadata).catch(() => undefined);
}
