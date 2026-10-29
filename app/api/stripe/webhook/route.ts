import type Stripe from "stripe";
import { sendTrialStartedEmail } from "@/lib/business-lifecycle";
import { createStripeClient } from "@/utils/stripe/server";
import { createAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  // Signature verification needs the raw, unparsed body.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: alreadyProcessed, error: lookupError } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (lookupError) {
    console.error("Stripe webhook: event lookup failed", lookupError);
    return new Response("Database error", { status: 500 });
  }

  if (alreadyProcessed) {
    return new Response("Already processed", { status: 200 });
  }

  try {
    await handleEvent(stripe, supabase, event);
  } catch (error) {
    // A non-2xx response makes Stripe retry the event with backoff.
    console.error(`Stripe webhook: failed to handle ${event.type} (${event.id})`, error);
    return new Response("Webhook handler failed", { status: 500 });
  }

  // Recorded only after handling succeeds, so a failed attempt is retried.
  const { error: recordError } = await supabase
    .from("stripe_events")
    .upsert({ id: event.id, type: event.type }, { ignoreDuplicates: true });

  if (recordError) {
    console.error("Stripe webhook: failed to record event", recordError);
  }

  return new Response("ok", { status: 200 });
}

async function handleEvent(
  stripe: Stripe,
  supabase: AdminClient,
  event: Stripe.Event,
) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        await syncSubscription(stripe, supabase, idOf(session.subscription));
      }
      break;
    }

    case "customer.subscription.created": {
      await syncSubscription(stripe, supabase, event.data.object.id);

      // Never fails the event: a retry would send the email again.
      if (event.data.object.status === "trialing") {
        await sendTrialStartedEmail(event.data.object.id).catch((error) =>
          console.error("Stripe webhook: trial started email failed", error),
        );
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(stripe, supabase, event.data.object.id);
      break;

    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscription =
        event.data.object.parent?.subscription_details?.subscription;
      if (subscription) {
        await syncSubscription(stripe, supabase, idOf(subscription));
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      await recordBillingAlert(stripe, supabase, event, {
        type: "refund",
        charge,
        amount: charge.amount_refunded,
        reason: null,
      });
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object;
      await recordBillingAlert(stripe, supabase, event, {
        type: "dispute",
        charge: await stripe.charges.retrieve(idOf(dispute.charge)),
        amount: dispute.amount,
        reason: dispute.reason,
      });
      break;
    }

    case "radar.early_fraud_warning.created": {
      const warning = event.data.object;
      const charge = await stripe.charges.retrieve(idOf(warning.charge));
      await recordBillingAlert(stripe, supabase, event, {
        type: "early_fraud_warning",
        charge,
        amount: charge.amount,
        reason: warning.fraud_type,
      });
      break;
    }
  }
}

// Records a refund, dispute or fraud warning for admin review and re-syncs
// any subscription the payment belongs to.
async function recordBillingAlert(
  stripe: Stripe,
  supabase: AdminClient,
  event: Stripe.Event,
  alert: {
    type: "refund" | "dispute" | "early_fraud_warning";
    charge: Stripe.Charge;
    amount: number;
    reason: string | null;
  },
) {
  const { charge } = alert;
  const subscriptionIds = charge.payment_intent
    ? await subscriptionsForPaymentIntent(stripe, idOf(charge.payment_intent))
    : [];

  for (const subscriptionId of subscriptionIds) {
    await syncSubscription(stripe, supabase, subscriptionId);
  }

  let businessId: string | null = null;

  if (charge.customer) {
    const { data, error } = await supabase
      .from("billing_customers")
      .select("business_id")
      .eq("stripe_customer_id", idOf(charge.customer))
      .maybeSingle();

    if (error) {
      throw error;
    }

    businessId = data?.business_id ?? null;
  }

  const { error } = await supabase.from("billing_alerts").upsert(
    {
      business_id: businessId,
      type: alert.type,
      stripe_event_id: event.id,
      stripe_charge_id: charge.id,
      stripe_subscription_id: subscriptionIds[0] ?? null,
      amount: alert.amount,
      currency: charge.currency,
      reason: alert.reason,
      livemode: event.livemode,
    },
    { onConflict: "stripe_event_id", ignoreDuplicates: true },
  );

  if (error) {
    throw error;
  }
}

// Since API version 2025-03-31.basil a Charge no longer links to its invoice.
// Follow PaymentIntent -> invoice payments -> invoice -> subscription instead.
async function subscriptionsForPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
) {
  const subscriptionIds = new Set<string>();

  for await (const payment of stripe.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: paymentIntentId },
    status: "paid",
  })) {
    const invoice = await stripe.invoices.retrieve(idOf(payment.invoice));
    const subscription =
      invoice.parent?.type === "subscription_details"
        ? invoice.parent.subscription_details?.subscription
        : null;

    if (subscription) {
      subscriptionIds.add(idOf(subscription));
    }
  }

  return [...subscriptionIds];
}

// Always re-fetches the subscription from Stripe rather than trusting the
// event payload, so events arriving out of order can't leave stale state.
async function syncSubscription(
  stripe: Stripe,
  supabase: AdminClient,
  subscriptionId: string,
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = idOf(subscription.customer);

  const { data: customer, error: customerError } = await supabase
    .from("billing_customers")
    .select("business_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (customerError) {
    throw customerError;
  }

  if (!customer) {
    // Not one of ours (e.g. created by `stripe trigger`). Retrying won't help.
    console.warn(
      `Stripe webhook: no business for customer ${customerId}, skipping subscription ${subscription.id}`,
    );
    return;
  }

  const item = subscription.items.data[0];

  const { error } = await supabase.from("subscriptions").upsert(
    {
      business_id: customer.business_id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      price_id: item?.price.id ?? null,
      // Growth prices' lookup keys start with "growth" (see lib/billing.ts).
      tier: item?.price.lookup_key?.startsWith("growth") ? "growth" : "pro",
      current_period_end: toTimestamp(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_end: toTimestamp(subscription.trial_end),
      canceled_at: toTimestamp(subscription.canceled_at),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) {
    throw error;
  }

  // Pause offers over the Free limit on downgrade, restore them on upgrade.
  const { error: planError } = await supabase.rpc("apply_business_plan", {
    requested_business_id: customer.business_id,
  });

  if (planError) {
    throw planError;
  }
}

function idOf(value: string | { id: string }) {
  return typeof value === "string" ? value : value.id;
}

function toTimestamp(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}
