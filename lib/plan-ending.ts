import { brandedEmail, sendEmails, type Email } from "@/lib/email";
import { notifyBusinessManagers } from "@/lib/notify";
import { planEnding } from "@/lib/notifications";
import {
    cameBack,
    cancellationLanded,
    whatStops,
    whatSurvives,
    type Standing,
} from "@/lib/plan-loss";
import { loadStanding } from "@/lib/plan-standing";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

// The day a plan is ended is the day a business is most likely to come
// back, and until now nothing was said at all: the Stripe portal took
// the cancellation and the product went quiet until things started
// failing. So one email and one notice, with the date, what stops, and
// what carries on regardless.
//
// Sent from the Stripe webhook, which runs on every subscription event
// there is, so both the predicate below and a row in
// business_lifecycle_sends stand between a customer and four copies of
// this.

function endDate(endsAt: string | null) {
    if (!endsAt) return null;

    return new Date(endsAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function planEndingEmail({
    to,
    businessName,
    businessId,
    standing,
    ends,
}: {
    to: string;
    businessName: string;
    businessId: string;
    standing: Standing;
    ends: string | null;
}): Email {
    const stops = whatStops(standing);
    const survives = whatSurvives(standing);

    return {
        to,
        subject: ends
            ? `What changes at ${businessName} on ${ends}`
            : `What changes at ${businessName} now your plan has ended`,
        ...brandedEmail({
            eyebrow: `${businessName} · Your plan`,
            title: ends ? `Your plan ends on ${ends}` : "Your plan has ended",
            paragraphs: [
                ends
                    ? `Nothing changes before then — you keep everything you are paying for until ${ends}. After that, here is exactly what is different, so none of it is a surprise.`
                    : "Here is exactly what is different now, so none of it is a surprise.",
            ],
            details: [
                ...stops.map((consequence) => ({
                    label: consequence.heading,
                    text: consequence.body,
                })),
                ...survives.map((consequence) => ({
                    label: `Stays as it is — ${consequence.heading.toLowerCase()}`,
                    text: consequence.body,
                })),
            ],
            action: {
                label: "Keep your plan",
                url: absoluteUrl(`/business/${businessId}/billing`),
            },
            footer:
                "You're getting this because you manage this business on Promotello. Change your mind any time — everything paused comes back on.",
        }),
    };
}

// Once per ending. The row is the lock: business_lifecycle_sends has a
// primary key of (business, kind), so the insert either takes it or
// tells us somebody already has.
export async function tellThemWhatStops({
    businessId,
    endsAt,
    tier,
}: {
    businessId: string;
    endsAt: string | null;
    tier: Standing["tier"];
}) {
    const admin = createAdminClient();

    const { error: claimed } = await admin
        .from("business_lifecycle_sends")
        .insert({ business_id: businessId, kind: "plan_ending" });

    // Already told: a duplicate key, not a failure.
    if (claimed) {
        return { sent: 0, alreadyTold: true };
    }

    const [{ data: business }, { data: addresses }, standing] = await Promise.all([
        admin.from("businesses").select("name").eq("id", businessId).maybeSingle(),
        admin.rpc("business_manager_emails", { requested_business_id: businessId }),
        loadStanding(admin, businessId, tier),
    ]);

    const name = business?.name ?? "your business";
    const ends = endDate(endsAt);

    await notifyBusinessManagers(
        businessId,
        planEnding({ businessId, businessName: name, ends, stopping: whatStops(standing).length }),
    );

    const emails = ((addresses ?? []) as string[]).map((to) =>
        planEndingEmail({ to, businessName: name, businessId, standing, ends }),
    );

    if (emails.length === 0) {
        return { sent: 0, alreadyTold: false };
    }

    const result = await sendEmails(emails);

    return { sent: result.sent, alreadyTold: false };
}

// So the next ending is told about too.
export async function forgetTheEnding(businessId: string) {
    await createAdminClient()
        .from("business_lifecycle_sends")
        .delete()
        .eq("business_id", businessId)
        .eq("kind", "plan_ending");
}

export { cameBack, cancellationLanded };
