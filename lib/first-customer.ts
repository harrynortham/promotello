import { businessHasPro, TRIAL_DAYS } from "@/lib/billing";
import { brandedEmail, sendEmails } from "@/lib/email";
import { firstCustomer } from "@/lib/notifications";
import { notifyBusinessManagers } from "@/lib/notify";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

// Somebody came.
//
// Every other message a business gets from us is an approval, an expiry,
// a stock alert or a billing problem. This is the only one that is good
// news about a customer, and it is the most persuasive thing we will
// ever send: free, true, and it arrives while they are still deciding
// whether any of this is real (docs/LAUNCH-FUNNEL.md).
//
// Once per business, ever, claimed in the database so that two customers
// in the same second produce one email rather than two. Nothing here
// throws: a voucher that was claimed must not fail because we could not
// celebrate it.

export type FirstCustomer =
    | { kind: "voucher"; what: string }
    | { kind: "card"; what: string };

export function firstCustomerEmail(
    business: { id: string; name: string },
    customer: FirstCustomer,
    hasPro: boolean,
    to: string,
) {
    const base = `/business/${business.id}`;

    const what = customer.kind === "voucher"
        ? `Somebody just claimed “${customer.what}”. They'll show a code on their phone when they're in — scan it with yours, or type it into your dashboard, and that's it.`
        : `Somebody just joined your loyalty card for “${customer.what}”. When they're in, scan their phone with yours to add a stamp.`;

    // The one honest place for the Pro line: they are holding proof that
    // the thing works, and the card is what turns this one visit into
    // the next. Said once, to a business that hasn't already paid.
    const next = hasPro
        ? "Keep your poster where people can see it from outside. The ones that bring customers in are the ones in the window, not behind the counter."
        : customer.kind === "voucher"
            ? `That's one customer. A stamp card is what brings them back a second time, and it's part of Pro — free for ${TRIAL_DAYS} days, and starting takes no card.`
            : `That's one customer, and the card is already doing its job. Unlimited offers and emails to your followers are the rest of Pro — free for ${TRIAL_DAYS} days, and starting takes no card.`;

    const { html, text } = brandedEmail({
        eyebrow: "First customer",
        title: `${business.name} has its first customer on Promotello`,
        paragraphs: [what, next],
        action: {
            label: customer.kind === "voucher" ? "See your vouchers" : "See your loyalty card",
            url: absoluteUrl(customer.kind === "voucher" ? `${base}/redemptions` : `${base}/loyalty`),
        },
        footer: `You're getting this because you run ${business.name} on Promotello. We only send it once.`,
    });

    return {
        to,
        subject: `Someone just ${customer.kind === "voucher" ? "claimed an offer at" : "joined the card at"} ${business.name}`,
        html,
        text,
    };
}

async function announce(businessId: string, customer: FirstCustomer) {
    const admin = createAdminClient();

    // The insert is the lock: whoever claims it is the only one who
    // tells them.
    const { data: claimed, error: claimError } = await admin.rpc("claim_business_milestone", {
        requested_business_id: businessId,
        requested_kind: "first_customer",
    });

    if (claimError || claimed !== true) {
        return { told: 0 };
    }

    const { data: business } = await admin
        .from("businesses")
        .select("id, name")
        .eq("id", businessId)
        .maybeSingle();

    if (!business) return { told: 0 };

    const [{ sent }, hasPro, { data: emails }] = await Promise.all([
        notifyBusinessManagers(businessId, firstCustomer(business, customer)),
        businessHasPro(admin, businessId).catch(() => true),
        admin.rpc("business_manager_emails", { requested_business_id: businessId }),
    ]);

    await sendEmails(
        ((emails ?? []) as string[]).map((to) => firstCustomerEmail(business, customer, hasPro, to)),
    );

    return { told: sent };
}

// A voucher claimed: the offer says what, and the offer says whose.
export async function firstCustomerFromVoucher(offerId: string) {
    try {
        const { data: offer } = await createAdminClient()
            .from("offers")
            .select("business_id, title")
            .eq("id", offerId)
            .maybeSingle();

        if (!offer) return { told: 0 };

        return await announce(offer.business_id, { kind: "voucher", what: offer.title });
    } catch (error) {
        console.error("Could not announce the first customer", error);
        return { told: 0 };
    }
}

// A loyalty card joined, which is a customer by any reading: they have
// given their name to come back.
export async function firstCustomerFromCard(programId: string) {
    try {
        const { data: program } = await createAdminClient()
            .from("loyalty_programs")
            .select("business_id, reward")
            .eq("id", programId)
            .maybeSingle();

        if (!program) return { told: 0 };

        return await announce(program.business_id, { kind: "card", what: program.reward });
    } catch (error) {
        console.error("Could not announce the first customer", error);
        return { told: 0 };
    }
}
